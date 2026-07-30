import { describe, expect, test } from "bun:test";

import { morph } from ".";

describe("morph", () => {
  test("converts a TaskWish actor step chain to an async function runner", () => {
    const source = `import { Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor");

export const { runSteps } = MyActor()
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
`;

    expect(morph(source)).toBe(`export async function runSteps(input: { message: string; }) {
  let firstStep: string;
  {
    firstStep = "step 1";
  }

  let lastStep: number;
  {
    lastStep = firstStep.length;
  }

  return lastStep;
}`);
  });

  test("preserves early returns by breaking out of the step block", () => {
    const source = `import { Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor");

export const { runSteps } = MyActor()
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

    expect(morph(source)).toBe(`export async function runSteps(input: { message: string; }) {
  let firstStep: string;
  firstStepBlock: {
    if (input.message.trim() === "") {
      firstStep = "empty";
      break firstStepBlock;
    }

    firstStep = "filled";
    break firstStepBlock;
  }

  let lastStep: number;
  {
    lastStep = firstStep.length;
  }

  return lastStep;
}`);
  });

  test("leaves helper functions outside the actor untouched", () => {
    const source = `import { Actor, Step } from "../../src";

function normalizeMessage(message: string) {
  return message.trim().toUpperCase();
}

const { MyActor } = Actor("MyActor");

export const { runSteps } = MyActor()
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

    expect(morph(source)).toBe(`function normalizeMessage(message: string) {
  return message.trim().toUpperCase();
}

export async function runSteps(input: { message: string; }) {
  let firstStep: string;
  {
    firstStep = normalizeMessage(input.message);
  }

  let lastStep: number;
  {
    lastStep = firstStep.length;
  }

  return lastStep;
}`);
  });

  test("keeps declarations after the action in place", () => {
    const source = `import { Actor, Step } from "../../src";

function normalizeMessage(message: string) {
  return message.trim().toUpperCase();
}

const { MyActor } = Actor("MyActor");

export const { runSteps } = MyActor()
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

    expect(morph(source)).toBe(`function normalizeMessage(message: string) {
  return message.trim().toUpperCase();
}

export async function runSteps(input: { message: string; }) {
  let firstStep: string;
  {
    firstStep = normalizeMessage(input.message);
  }

  return firstStep;
}

const main = async () => {
  const result = await runSteps({ message: "hello" });

  console.log(result);
};

main();`);
  });

  test("exports a wrapper with the original action binding name", () => {
    const source = `import { Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor");

export const { runSteps } = MyActor()
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

    expect(morph(source)).toBe(`export async function runSteps(input: { name: string; }) {
  let firstStep: string;
  {
    firstStep = \`Hello \${input.name}\`;
  }

  let lastStep: string;
  {
    lastStep = \`Hello \${input.name}\`;
  }

  return lastStep;
}`);
  });

  test("uses ArkType inference for input schemas", () => {
    const source = `import { Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor");

export const { runSteps } = MyActor()
  .on("Command", "runSteps")

  .input({ name: "string", tags: "string[]", "age?": "number" })

  .run(
    Step("firstStep", function () {
      return this.input.tags.length;
    }),
  );
`;

    expect(morph(source)).toBe(`export async function runSteps(input: { name: string; tags: string[]; age?: number | undefined; }) {
  let firstStep: number;
  {
    firstStep = input.tags.length;
  }

  return firstStep;
}`);
  });

  test("awaits async step handlers inline", () => {
    const source = `import { Actor, Step } from "../../src";

async function loadGreeting(name: string) {
  return \`Hello \${name}\`;
}

const { MyActor } = Actor("MyActor");

export const { runSteps } = MyActor()
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

    expect(morph(source)).toBe(`async function loadGreeting(name: string) {
  return \`Hello \${name}\`;
}

export async function runSteps(input: { name: string; }) {
  let firstStep: string;
  {
    firstStep = await loadGreeting(input.name);
  }

  let lastStep: number;
  {
    lastStep = firstStep.length;
  }

  return lastStep;
}`);
  });

  test("awaits non-async step methods that return promises", () => {
    const source = `import { Actor, Step } from "../../src";

function loadGreeting(name: string) {
  return Promise.resolve(\`Hello \${name}\`);
}

const { MyActor } = Actor("MyActor");

export const { runSteps } = MyActor()
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

    expect(morph(source)).toBe(`function loadGreeting(name: string) {
  return Promise.resolve(\`Hello \${name}\`);
}

export async function runSteps(input: { name: string; }) {
  let firstStep: string;
  {
    firstStep = await loadGreeting(input.name);
  }

  let lastStep: number;
  {
    lastStep = firstStep.length;
  }

  return lastStep;
}`);
  });
});
