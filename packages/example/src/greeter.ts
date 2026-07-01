import { Actor, Event, Step } from "@taskwish/core";

export const { Greeter } = Actor("Greeter").def(
  Event("Message", { name: "string" }),
);

export const { hello } = Greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Step("notify", function () {
      return this.signal("Greeter::Message", { name: this.input.name });
    }),

    Step("notify", function () {
      return `Hello ${this.input.name}`;
    }),
  );
