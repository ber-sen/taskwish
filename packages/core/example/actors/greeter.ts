"use server";

import { Actor } from "../../src";

const { Greeter } = Actor("Greeter");

export const { hello } = Greeter("hello")
  .on({ name: "string" })

  .handler(function () {
    return `Hello ${this.input.name}`;
  });

export const { bye } = Greeter("bye")
  .on({ name: "string" })

  .handler(function () {
    return `Bye ${this.input.name}`;
  });
