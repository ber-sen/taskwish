"use server";

import { Actor, Step } from "../../src";

const { Greeter } = Actor("Greeter");

const { hello } = Greeter("hello")
  .on({ name: "string" })

  .handler(function () {
    return `Hello ${this.input.name}`;
  });

const { bye } = Greeter("bye")
  .on({ name: "string" })

  .handler(
    Step("Name", function () {
      return this.input.name;
    }),
    
    Step("End step", function () {
      return `Bye ${this.name}`;
    }),
  );

export { hello, bye };
