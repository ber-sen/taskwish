"use server";

import { Actor, Step } from "../../src";

export const { Greeter } = Actor("Greeter");

// hello action
export const { hello } = Greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(function () {
    return `Hello ${this.input.name}`;
  });

// bye action
export const { bye } = Greeter()
  .on("Command", "bye")

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
