import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { morph, morphDir } from ".";

function expectParts(output: string, parts: string[]) {
  for (const part of parts) {
    expect(output).toContain(part);
  }
}

describe("morph", () => {
  test("converts a TaskWish actor step chain to traced runners and service helpers", () => {
    const source = `import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("firstStep", function () {
      return "step 1";
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );

export const { MyActor } = myActor().service({ runSteps });
`;
    expect(morph(source))
      .toBe(`import { Trace, consume } from "@taskwish/wire";

export const runSteps = Object.assign(
  async function runSteps(input: { message: string; }) {
    return runStepsCtx().run(input);
  },
  {
    ...runStepsCtx(),
    ctx: runStepsCtx,
  },
);

function runStepsCtx(scope: {} = {}) {

  async function run(input: { message: string; }) {
    return consume(stream(input));
  }

  async function* stream(input: { message: string; }) {

    yield new Trace("MyActor::runSteps", { input });

    const firstStep = "step 1";

    yield new Trace("MyActor::runSteps.firstStep", { result: firstStep });

    const lastStep = firstStep.length;

    yield new Trace("MyActor::runSteps.lastStep", { result: lastStep });

    yield new Trace("MyActor::runSteps", { result: lastStep });

    return lastStep;
  }

  return { run, stream };
}

export const MyActor = {
  runSteps
};`);
  });

  test("keeps event listeners out of direct service exports", () => {
    const source = `import { Actor, Step } from "../../src";

const { greeter } = Actor("Greeter");

export const { hello } = greeter()
  .on("Command", "hello")

  .run(
    Step("greeting", function () {
      return "hello";
    }),
  );

export const { onNewEmail } = greeter()
  .on("NewEmail")

  .run(
    Step("result", function () {
      return "email";
    }),
  );

export const { Greeter } = greeter().service({
  hello,
  onNewEmail,
});
`;

    const output = morph(source);

    expectParts(output, [
      `export const hello = Object.assign(
  async function hello()`,
      `export const onNewEmail = Object.assign(
  async function onNewEmail()`,
      `ctx: helloCtx,`,
      `yield new Trace("Greeter::hello", { input });`,
      `yield new Trace("Greeter::onNewEmail", { input });`,
      `export const Greeter = {
  hello
};`,
    ]);
    expect(output).not.toContain(`onNewEmail: onNewEmail.run`);
    expect(output).not.toContain(`onNewEmail: onNewEmail.stream`);
  });

  test("preserves early returns by breaking out of the step block", () => {
    const source = `import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("firstStep", function () {
      if (this.input.message.trim() === "") {
        return "empty";
      }

      return "filled";
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );
`;

    expectParts(morph(source), [
      `firstStepBlock: {`,
      `firstStep = "empty";
        break firstStepBlock;`,
      `yield new Trace("MyActor::runSteps.firstStep", { result: firstStep });`,
      `const lastStep = firstStep.length;`,
    ]);
  });

  test("keeps blocks for multi-expression step handlers", () => {
    const source = `import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("firstStep", function () {
      const normalized = this.input.message.trim();
      const upper = normalized.toUpperCase();

      return upper;
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );
`;

    expectParts(morph(source), [
      `const normalized = input.message.trim();`,
      `const upper = normalized.toUpperCase();`,
      `firstStep = upper;`,
      `yield new Trace("MyActor::runSteps.firstStep", { result: firstStep });`,
    ]);
  });

  test("leaves helper functions outside the actor untouched", () => {
    const source = `import { Actor, Step } from "../../src";

function normalizeMessage(message: string) {
  return message.trim().toUpperCase();
}

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("firstStep", function () {
      return normalizeMessage(this.input.message);
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );
`;

    expectParts(morph(source), [
      `function normalizeMessage(message: string) {
  return message.trim().toUpperCase();
}`,
      `const firstStep = normalizeMessage(input.message);`,
      `const lastStep = firstStep.length;`,
    ]);
  });

  test("keeps declarations after the action in place", () => {
    const source = `import { Actor, Step } from "../../src";

function normalizeMessage(message: string) {
  return message.trim().toUpperCase();
}

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("firstStep", function () {
      return normalizeMessage(this.input.message);
    }),
  );

const main = async () => {
  const result = await runSteps({ message: "hello" });

  console.log(result);
};

main();
`;

    expectParts(morph(source), [
      `yield new Trace("MyActor::runSteps", { result: firstStep });`,
      `const main = async () => {
  const result = await runSteps({ message: "hello" });

  console.log(result);
};

main();`,
    ]);
  });

  test("exports a wrapper with the original action binding name", () => {
    const source = `import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "Run steps")

  .input({ name: "string" })

  .run(
    Step("firstStep", function () {
      return \`Hello \${this.input.name}\`;
    }),

    Step("lastStep", function () {
      return \`Hello \${this.input.name}\`;
    }),
  );
`;

    expectParts(morph(source), [
      `async function runSteps(input: { name: string; })`,
      `export const runSteps = Object.assign(`,
      `...runStepsCtx(),`,
      `ctx: runStepsCtx,`,
      `function runStepsCtx(scope: {} = {})`,
    ]);
  });

  test("generates context-bound run and stream wrappers", () => {
    const source = `import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "Run steps")

  .input({ name: "string" })

  .run(
    Step("result", function () {
      return this.abortSignal?.aborted ?? false;
    }),
  );
`;

    expectParts(morph(source), [
      `ctx: runStepsCtx,`,
      `function runStepsCtx(scope: { abortSignal?: unknown } = {})`,
      `async function run(input: { name: string; }) {
    return consume(stream(input));
  }`,
      `async function* stream(input: { name: string; })`,
      `const abortSignal = scope.abortSignal as AbortSignal | undefined;`,
      `const result = abortSignal?.aborted ?? false;`,
    ]);
  });

  test("uses ArkType inference for input schemas", () => {
    const source = `import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "runSteps")

  .input({ name: "string", tags: "string[]", "age?": "number" })

  .run(
    Step("firstStep", function () {
      return this.input.tags.length;
    }),
  );
`;

    expectParts(morph(source), [
      `input: { name: string; tags: string[]; age?: number | undefined; }`,
      `const firstStep = input.tags.length;`,
      `yield new Trace("MyActor::runSteps.firstStep", { result: firstStep });`,
    ]);
  });

  test("awaits async step handlers inline", () => {
    const source = `import { Actor, Step } from "../../src";

async function loadGreeting(name: string) {
  return \`Hello \${name}\`;
}

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "runSteps")

  .input({ name: "string" })

  .run(
    Step("firstStep", async function () {
      return await loadGreeting(this.input.name);
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );
`;

    expectParts(morph(source), [
      `async function loadGreeting(name: string)`,
      `const firstStep = await loadGreeting(input.name);`,
      `const lastStep = firstStep.length;`,
    ]);
  });

  test("awaits non-async step methods that return promises", () => {
    const source = `import { Actor, Step } from "../../src";

function loadGreeting(name: string) {
  return Promise.resolve(\`Hello \${name}\`);
}

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
  .on("Command", "runSteps")

  .input({ name: "string" })

  .run(
    Step("firstStep", function () {
      return loadGreeting(this.input.name);
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );
`;

    expectParts(morph(source), [
      `function loadGreeting(name: string)`,
      `const firstStep = await loadGreeting(input.name);`,
      `const lastStep = firstStep.length;`,
    ]);
  });

  test("morphDir preserves action directive prologues", async () => {
    const root = await mkdtemp(join(tmpdir(), "taskwish-bare-"));
    const sourceDir = join(root, "src", "greeter");

    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(sourceDir, "greeter.ts"),
      `import { Actor } from "taskwish";

export const { greeter } = Actor("Greeter");
`
    );
    await writeFile(
      join(sourceDir, "hello.ts"),
      `"use server";

import { greeter } from "./greeter";

export const { hello } = greeter()
  .on("Command", "hello")

  .run(function () {
    return "hello";
  });
`
    );
    await writeFile(
      join(sourceDir, "index.ts"),
      `import { greeter } from "./greeter";
import { hello } from "./hello";

export const { Greeter } = greeter().service({ hello });
`
    );

    await morphDir("./greeter", { baseDir: join(root, "src") });

    const output = await readFile(
      join(root, "bare", "greeter", "hello.ts"),
      "utf8"
    );

    expect(
      output.startsWith(
        `"use server";

import { Trace, consume } from "@taskwish/wire";`
      )
    ).toBe(true);
  });

  test("morphDir resolves listener input from imported service events", async () => {
    const root = await mkdtemp(join(tmpdir(), "taskwish-bare-"));
    const greeterDir = join(root, "src", "greeter");
    const billerDir = join(root, "src", "biller");

    await mkdir(greeterDir, { recursive: true });
    await mkdir(billerDir, { recursive: true });
    await writeFile(
      join(greeterDir, "greeter.ts"),
      `import { Actor, Event } from "taskwish";

export const { greeter } = Actor("Greeter").scope(
  Event("Message", { name: "string" }),
);
`
    );
    await writeFile(
      join(greeterDir, "hello.ts"),
      `import { greeter } from "./greeter";

export const { hello } = greeter()
  .on("Command", "hello")
  .input({ name: "string" })
  .run(function () {
    return this.signal("Greeter::Message", { name: this.input.name });
  });
`
    );
    await writeFile(
      join(greeterDir, "index.ts"),
      `import { greeter } from "./greeter";
import { hello } from "./hello";

export const { Greeter } = greeter().service({ hello });
`
    );
    await writeFile(
      join(billerDir, "biller.ts"),
      `import { Actor } from "taskwish";
import { Greeter } from "../greeter";

export const { biller } = Actor("Biller").use(Greeter);
`
    );
    await writeFile(
      join(billerDir, "on-greeter-message.ts"),
      `import { biller } from "./biller";

export const { onGreeterMessage } = biller()
  .on("Greeter::Message")
  .run(function () {
    return {
      invoice: \`Invoice created from greeter message: \${this.input.name}\`,
    };
  });
`
    );
    await writeFile(
      join(billerDir, "index.ts"),
      `import { biller } from "./biller";
import { onGreeterMessage } from "./on-greeter-message";

export const { Biller } = biller().service({ onGreeterMessage });
`
    );

    await morphDir("./biller", { baseDir: join(root, "src") });

    const output = await readFile(
      join(root, "bare", "biller", "on-greeter-message.ts"),
      "utf8"
    );

    expect(output).toContain(
      `async function onGreeterMessage(input: { name: string; })`
    );
    expect(output).toContain(`input: { name: string; }`);
    expect(output).not.toContain(`input: any`);
  });
});
