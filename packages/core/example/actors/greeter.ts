"use server";

import { Actor, Step } from "../../src";

const { Greeter } = Actor("Greeter", {
  API_KEY: "string",
});

// hello
const { hello } = Greeter("hello")
  .on({ name: "string" })

  .run(function () {
    return `Hello ${this.input.name}`;
  });

// bye
const { bye } = Greeter("bye")
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

export { hello, bye };
