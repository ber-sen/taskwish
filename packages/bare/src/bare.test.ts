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

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
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

export const { MyActor } = actor().service({ runSteps });
`;
    expectParts(morph(source), [
      `import { Wire } from "@taskwish/wire";`,
      `interface RunStepsAction`,
      `type RunStepsScope = { wire: Wire };`,
      `type RunStepsScopePatch = { wire?: Wire };`,
      `export const runSteps = async function runSteps(input: { message: string; })`,
      `runSteps.run = runStepsCtx().run;`,
      `runSteps.stream = runStepsCtx().stream;`,
      `function runStepsCtx(ctx: RunStepsScopePatch = {})`,
      `const initialScope: RunStepsScope = { wire };
  const scope: RunStepsScope = initialScope;
  if (ctx.wire !== undefined) scope.wire = ctx.wire;`,
      `const firstStep = "step 1";`,
      `const lastStep = firstStep.length;`,
      `export const MyActor = {
  runSteps
};`,
    ]);
  });

  test("keeps event listeners out of direct service exports", () => {
    const source = `import { Actor, Step } from "../../src";

const { actor } = Actor("Greeter");

export const { hello } = actor()
  .on("Command", "hello")

  .run(
    Step("greeting", function () {
      return "hello";
    }),
  );

export const { onNewEmail } = actor()
  .on("NewEmail")

  .run(
    Step("result", function () {
      return "email";
    }),
  );

export const { Greeter } = actor().service({
  hello,
  onNewEmail,
});
`;

    const output = morph(source);

    expectParts(output, [
      `import { Wire, addListener } from "@taskwish/wire";`,
      `interface HelloAction`,
      `export const hello = async function hello()`,
      `interface OnNewEmailAction`,
      `export const onNewEmail = async function onNewEmail()`,
      `scope.wire.trace("Greeter::hello", { input });`,
      `scope.wire.trace("Greeter::onNewEmail", { input });`,
      `addListener("Greeter::NewEmail", onNewEmail);`,
      `export const Greeter = {
  hello
};`,
    ]);
    expect(output).not.toContain(`onNewEmail: onNewEmail.run`);
    expect(output).not.toContain(`onNewEmail: onNewEmail.stream`);
  });

  test("preserves early returns by breaking out of the step block", () => {
    const source = `import { Actor, Step } from "../../src";

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
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
      `scope.wire.trace("MyActor::runSteps.firstStep", { result: firstStep });`,
      `const lastStep = firstStep.length;`,
    ]);
  });

  test("keeps blocks for multi-expression step handlers", () => {
    const source = `import { Actor, Step } from "../../src";

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
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
      `scope.wire.trace("MyActor::runSteps.firstStep", { result: firstStep });`,
    ]);
  });

  test("infers object types for multi-expression step handlers", () => {
    const source = `import { Actor, Step } from "../../src";

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
  .on("Command", "runSteps")

  .run(
    Step("result", function () {
      const title = "Example";
      const url = "https://example.com";

      return { title, url };
    }),
  );
`;

    expectParts(morph(source), [
      `let result: { title: string; url: string; };`,
      `result = { title, url };`,
    ]);
  });

  test("leaves helper functions outside the actor untouched", () => {
    const source = `import { Actor, Step } from "../../src";

function normalizeMessage(message: string) {
  return message.trim().toUpperCase();
}

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
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

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
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
      `scope.wire.trace("MyActor::runSteps", { result: firstStep });`,
      `const main = async () => {
  const result = await runSteps({ message: "hello" });

  console.log(result);
};

main();`,
    ]);
  });

  test("exports a wrapper with the original action binding name", () => {
    const source = `import { Actor, Step } from "../../src";

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
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
      `interface RunStepsAction`,
      `export const runSteps = async function runSteps(input: { name: string; })`,
      `async function runSteps(input: { name: string; })`,
      `function runStepsCtx(ctx: RunStepsScopePatch = {})`,
    ]);
  });

  test("generates context-bound run and stream wrappers", () => {
    const source = `import { Actor, Step } from "../../src";

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
  .on("Command", "Run steps")

  .input({ name: "string" })

  .run(
    Step("result", function () {
      return this.abortSignal?.aborted ?? false;
    }),
  );
`;

    expectParts(morph(source), [
      `import { Wire } from "@taskwish/wire";`,
      `function runStepsCtx(ctx: RunStepsScopePatch = {})`,
      `const wire = new Wire();`,
      `const initialScope: RunStepsScope = { wire, abortSignal: undefined as AbortSignal | undefined };
  const scope: RunStepsScope = initialScope;
  if (ctx.wire !== undefined) scope.wire = ctx.wire;
  if (ctx.abortSignal !== undefined) scope.abortSignal = ctx.abortSignal;`,
      `async function run(input: { name: string; }) {
    return stream(input);
  }`,
      `async function stream(input: { name: string; })`,
      `const abortSignal = scope.abortSignal as AbortSignal | undefined;`,
      `const result = abortSignal?.aborted ?? false;`,
    ]);
  });

  test("rewrites injected action calls to scope actions", () => {
    const source = `import { Browser } from "./browser";
import { Actor, Step } from "../../src";

const { actor } = Actor("MyActor").use(Browser);

export const { runSteps } = actor()
  .on("Command", "runSteps")

  .run(
    Step("page", function () {
      return this.actions.browser.browse({
        url: "https://example.com",
      });
    }),
  );
`;

    expectParts(morph(source), [
      `import { Wire } from "@taskwish/wire";`,
      `import { Browser } from "./browser";`,
      `function runStepsCtx(ctx: RunStepsScopePatch = {})`,
      `const initialScope: RunStepsScope = { wire, actions: { browser: { browse: Browser.browse } } };
  const scope: RunStepsScope = initialScope;
  if (ctx.wire !== undefined) scope.wire = ctx.wire;
  if (ctx.actions !== undefined) {
    if (ctx.actions.browser !== undefined) {
      if (ctx.actions.browser.browse !== undefined) scope.actions.browser.browse = ctx.actions.browser.browse;
    }
  }`,
      `const page = await scope.actions.browser.browse({
      url: "https://example.com",
    });`,
    ]);
  });

  test("ctx accepts partial action scope patches in generated bare output", () => {
    const source = `import { Browser } from "./browser";
import { Actor, Step } from "../../src";

const { actor } = Actor("MyActor").use(Browser);

export const { runSteps } = actor()
  .on("Command", "runSteps")

  .run(
    Step("page", function () {
      return this.actions.browser.browse({
        url: "https://example.com",
      });
    }),

    Step("closed", function () {
      return this.actions.browser.close();
    }),
  );
`;

    expectParts(morph(source), [
      `function runStepsCtx(ctx: RunStepsScopePatch = {})`,
      `const initialScope: RunStepsScope = { wire, actions: { browser: { browse: Browser.browse, close: Browser.close } } };
  const scope: RunStepsScope = initialScope;
  if (ctx.wire !== undefined) scope.wire = ctx.wire;
  if (ctx.actions !== undefined) {
    if (ctx.actions.browser !== undefined) {
      if (ctx.actions.browser.browse !== undefined) scope.actions.browser.browse = ctx.actions.browser.browse;
      if (ctx.actions.browser.close !== undefined) scope.actions.browser.close = ctx.actions.browser.close;
    }
  }`,
      `const page = await scope.actions.browser.browse({`,
      `const closed = await scope.actions.browser.close();`,
    ]);
  });

  test("uses ArkType inference for input schemas", () => {
    const source = `import { Actor, Step } from "../../src";

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
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
      `scope.wire.trace("MyActor::runSteps.firstStep", { result: firstStep });`,
    ]);
  });

  test("rewrites signals to the wire event bus", () => {
    const source = `import { Actor, Step } from "../../src";

const { actor } = Actor("Greeter");

export const { hello } = actor()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Step("notify", function () {
      return this.signal("Greeter::Message", { name: this.input.name });
    }),
  );
`;

    const output = morph(source);

    expect(output).toContain(
      `const notify = scope.wire.signal("Greeter::Message", { name: input.name }) as Record<string, unknown>;`
    );
    expect(output).not.toContain(`const signal =`);
  });

  test("awaits async step handlers inline", () => {
    const source = `import { Actor, Step } from "../../src";

async function loadGreeting(name: string) {
  return \`Hello \${name}\`;
}

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
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

  test("does not await object literals returned from async step handlers", () => {
    const source = `import { Actor, Step } from "../../src";

async function loadTitle() {
  return "Hello";
}

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
  .on("Command", "runSteps")

  .run(
    Step("result", async function () {
      const title = await loadTitle();
      const url = "https://example.com";

      return {
        title,
        url,
      };
    }),
  );
`;

    expectParts(morph(source), [
      `const title = await loadTitle();`,
      `result = {
        title,
        url,
      };`,
    ]);
  });

  test("awaits non-async step methods that return promises", () => {
    const source = `import { Actor, Step } from "../../src";

function loadGreeting(name: string) {
  return Promise.resolve(\`Hello \${name}\`);
}

const { actor } = Actor("MyActor");

export const { runSteps } = actor()
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

export const { actor } = Actor("Greeter");
`
    );
    await writeFile(
      join(sourceDir, "hello.ts"),
      `"use server";

import { actor } from "./greeter";

export const { hello } = actor()
  .on("Command", "hello")

  .run(function () {
    return "hello";
  });
`
    );
    await writeFile(
      join(sourceDir, "index.ts"),
      `import { actor } from "./greeter";
import { hello } from "./hello";

export const { Greeter } = actor().service({ hello });
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

import { Wire } from "@taskwish/wire";`
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

export const { actor } = Actor("Greeter").scope(
  Event("Message", { name: "string" }),
);
`
    );
    await writeFile(
      join(greeterDir, "hello.ts"),
      `import { actor } from "./greeter";

export const { hello } = actor()
  .on("Command", "hello")
  .input({ name: "string" })
  .run(function () {
    return this.signal("Greeter::Message", { name: this.input.name });
  });
`
    );
    await writeFile(
      join(greeterDir, "index.ts"),
      `import { actor } from "./greeter";
import { hello } from "./hello";

export const { Greeter } = actor().service({ hello });
`
    );
    await writeFile(
      join(billerDir, "biller.ts"),
      `import { Actor } from "taskwish";
import { Greeter } from "../greeter";

export const { actor } = Actor("Biller").use(Greeter);
`
    );
    await writeFile(
      join(billerDir, "on-greeter-message.ts"),
      `import { actor } from "./biller";

export const { onGreeterMessage } = actor()
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
      `import { actor } from "./biller";
import { onGreeterMessage } from "./on-greeter-message";

export const { Biller } = actor().service({ onGreeterMessage });
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
    expect(output).toContain(
      `import { Wire, addListener } from "@taskwish/wire";`
    );
    expect(output).toContain(
      `addListener("Greeter::Message", onGreeterMessage);`
    );
    expect(output).not.toContain(`input: any`);
  });
});
