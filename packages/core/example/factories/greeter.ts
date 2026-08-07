import { Event, Step } from "taskwish";

const { GreeterInstance } = Class("Greeter").scope(
  Private({
    name: "string",
  }),

  Event("Message", { name: "string" }),
);

export const { hello } = GreeterInstance()
  .on("Command", "hello")

  .run(
    Step("notify", function () {
      return this.name;
    }),
  );

export const { goodbye } = GreeterInstance()
  .on("Command", "goodbye")

  .run(
    Step("greet", function () {
      return `Bye Bye, ${this.name}!`;
    }),
  );

export const { Greeter } = GreeterInstance()
  .factory()

  .public(hello, goodbye)

  .input({ name: "string" })

  .run(
    Step("create", function () {
      this.name = this.input.name;
    }),
  );

///
const greeter = Greeter({ name: "string" });

greeter.hello();
