import { describe, expect, test } from "bun:test";

import { morph } from ".";

describe("morph", () => {
  test("converts a TaskWish actor step chain to a class runner", () => {
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

    expect(morph(source)).toBe(`class MyActorRunSteps {
  public input: { message: string; };
  declare public firstStep: string;
  declare public lastStep: number;

  constructor(input: { message: string; }) {
    this.input = input;
  }

  #firstStep() {
    return "step 1";
  }

  #lastStep() {
    return this.firstStep.length;
  }

  async run() {
    this.firstStep = this.#firstStep();

    this.lastStep = this.#lastStep();

    return this.lastStep;
  }
}

export const runSteps = (input: { message: string; }) =>
  new MyActorRunSteps(input).run();`);
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

class MyActorRunSteps {
  public input: { message: string; };
  declare public firstStep: string;
  declare public lastStep: number;

  constructor(input: { message: string; }) {
    this.input = input;
  }

  #firstStep() {
    return normalizeMessage(this.input.message);
  }

  #lastStep() {
    return this.firstStep.length;
  }

  async run() {
    this.firstStep = this.#firstStep();

    this.lastStep = this.#lastStep();

    return this.lastStep;
  }
}

export const runSteps = (input: { message: string; }) =>
  new MyActorRunSteps(input).run();`);
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

    expect(morph(source)).toBe(`class MyActorRunSteps {
  public input: { name: string; };
  declare public firstStep: string;
  declare public lastStep: string;

  constructor(input: { name: string; }) {
    this.input = input;
  }

  #firstStep() {
    return \`Hello \${this.input.name}\`;
  }

  #lastStep() {
    return \`Hello \${this.input.name}\`;
  }

  async run() {
    this.firstStep = this.#firstStep();

    this.lastStep = this.#lastStep();

    return this.lastStep;
  }
}

export const runSteps = (input: { name: string; }) =>
  new MyActorRunSteps(input).run();`);
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

    expect(morph(source)).toBe(`class MyActorRunSteps {
  public input: { name: string; tags: string[]; age?: number | undefined; };
  declare public firstStep: number;

  constructor(input: { name: string; tags: string[]; age?: number | undefined; }) {
    this.input = input;
  }

  #firstStep() {
    return this.input.tags.length;
  }

  async run() {
    this.firstStep = this.#firstStep();

    return this.firstStep;
  }
}

export const runSteps = (input: { name: string; tags: string[]; age?: number | undefined; }) =>
  new MyActorRunSteps(input).run();`);
  });

  test("only emits async step methods for async handlers", () => {
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

class MyActorRunSteps {
  public input: { name: string; };
  declare public firstStep: string;
  declare public lastStep: number;

  constructor(input: { name: string; }) {
    this.input = input;
  }

  async #firstStep() {
    return await loadGreeting(this.input.name);
  }

  #lastStep() {
    return this.firstStep.length;
  }

  async run() {
    this.firstStep = await this.#firstStep();

    this.lastStep = this.#lastStep();

    return this.lastStep;
  }
}

export const runSteps = (input: { name: string; }) =>
  new MyActorRunSteps(input).run();`);
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

class MyActorRunSteps {
  public input: { name: string; };
  declare public firstStep: string;
  declare public lastStep: number;

  constructor(input: { name: string; }) {
    this.input = input;
  }

  #firstStep() {
    return loadGreeting(this.input.name);
  }

  #lastStep() {
    return this.firstStep.length;
  }

  async run() {
    this.firstStep = await this.#firstStep();

    this.lastStep = this.#lastStep();

    return this.lastStep;
  }
}

export const runSteps = (input: { name: string; }) =>
  new MyActorRunSteps(input).run();`);
  });
});
