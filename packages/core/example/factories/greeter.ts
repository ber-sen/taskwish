import { Event, Step } from "taskwish";

const { GreeterInstance } = Instance("Greeter").scope(
  Private({
    name: "string",
  }),

  Event("Message", { name: "string" }),
);

export const { hello } = GreeterInstance()
  .action("hello")

  .run(
    Step("notify", function () {
      return this.name;
    }),
  );

export const { goodbye } = GreeterInstance()
  .action("goodbye")

  .run(
    Step("greet", function () {
      return `Bye Bye, ${this.name}!`;
    }),
  );

export const { Greeter } = Factory("Greeter")
  .of(GreeterInstance)

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
