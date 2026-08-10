import { describe, expect, test } from "bun:test";

import { morph } from ".";

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

export async function runSteps(input: { message: string; }) {
  return consume(stream_runSteps({ input }));
}

async function run_runSteps(params: {
  input: { message: string; };
}) {
  return consume(stream_runSteps(params));
}

async function* stream_runSteps(params: {
  input: { message: string; };
}) {
  const input = params.input;

  yield new Trace("MyActor::runSteps", { input });

  const firstStep = "step 1";

  yield new Trace("MyActor::runSteps.firstStep", { result: firstStep });

  const lastStep = firstStep.length;

  yield new Trace("MyActor::runSteps.lastStep", { result: lastStep });

  yield new Trace("MyActor::runSteps", { result: lastStep });

  return lastStep;
}

export const MyActor = {
  runSteps,
  run: {
    runSteps: run_runSteps
  },
  stream: {
    runSteps: stream_runSteps
  }
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
      `export async function hello()`,
      `export async function onNewEmail()`,
      `yield new Trace("Greeter::hello", { input });`,
      `yield new Trace("Greeter::onNewEmail", { input });`,
      `export const Greeter = {
  hello,
  run: {
    hello: run_hello
  },
  stream: {
    hello: stream_hello
  }
};`,
    ]);
    expect(output).not.toContain(`onNewEmail: run_onNewEmail`);
    expect(output).not.toContain(`onNewEmail: stream_onNewEmail`);
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
      `export async function runSteps(input: { name: string; })`,
      `async function run_runSteps(params: {`,
      `async function* stream_runSteps(params: {`,
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
      `input: { name: string; tags: string[]; age?: number | undefined; };`,
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
});
