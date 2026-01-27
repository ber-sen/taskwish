"use server";

import { Actor } from "../../src";

const { Greeter } = Actor("Greeter");

const { hello } = Greeter("hello")
  .on({ name: "string" })

  .handler(function () {
    return `Hello ${this.input.name}`;
  });

const { bye } = Greeter("bye")
  .on({ name: "string" })

  .handler(function () {
    return `Bye ${this.input.name}`;
  });

export { hello, bye };
