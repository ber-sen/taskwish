"use server";

import { Actor, Step } from "../../src";

const { Greeter } = Actor("Greeter", {
  API_KEY: "string",
});

const { hello } = Greeter("hello")
  .on({ name: "string" })

  .run(function () {
    return `Hello ${this.input.name}`;
  });

const { bye } = Greeter("bye")
  .on({ name: "string" })

  .run(
    Step("Name", function () {
      return this.input.name;
    }),

    Step("End step", [
      function () {
        return `Bye ${this.name}`;
      },
      (a) => 3,
      (b) => true as const
    ]),

    Step("Real end", function(){
      this.endStep
    })
  );

export { hello, bye };
