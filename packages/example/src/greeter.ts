import { Actor, Event, Step } from "@taskwish/core";

export const { Greeter } = Actor("Greeter").def(
  Event("Message", { content: "string" }),
);

export const { hello } = Greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Step("greet", function () {
      return `Hello ${this.input.name}`;
    }),

    Step("notify", function () {
      return this.greet;
    }),
  );
