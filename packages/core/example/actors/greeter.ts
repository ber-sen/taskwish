"use server";

import { Actor, Step } from "../../src";

const { Greeter } = Actor("Greeter", {
  API_KEY: "string",
});

// hello action
export const { hello } = Greeter()
  .Action("Hello")

  .on({ name: "string" })

  .run(function () {
    return `Hello ${this.input.name}`;
  });

// bye action
export const { bye } = Greeter()
  .Action("Bye")

  .on({ name: "string" })

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
