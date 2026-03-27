"use server";

import { Actor, Step } from "../../src";

const { Greeter } = Actor("Greeter");

// hello action
export const { hello } = Greeter()
  .on("Command", "Hello")

  .input({ name: "string" })

  .run(function () {
    return `Hello ${this.input.name}`;
  });

// bye action
export const { bye } = Greeter()
  .on("Command", "Bye")

  .input({ name: "string" })

  .run(
    Step("Name", function () {
      return this.input.name;
    }),

    Step("Mid step", function () {
      return `Bye ${this.name}`;
    }),

    Step("Last step", function () {
      return this.midStep;
    }),
  );
