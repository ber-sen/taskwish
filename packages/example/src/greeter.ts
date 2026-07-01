import { Actor, Event } from "@taskwish/core";

export const { Greeter } = Actor("Greeter").def(
  Event("Message", { content: "string" }),
);

export const { hello } = Greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(function () {
    return `Hello ${this.input.name}`;
  });

