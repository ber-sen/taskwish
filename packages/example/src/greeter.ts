import { Actor, Event, Step } from "taskwish";

const { greeter } = Actor("Greeter").scope(
  Event("Message", { name: "string" }),
);

export const { hello } = greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Step("notify", function () {
      return this.signal("Greeter::Message", { name: this.input.name });
    }),

    Step("greet", function () {
      return `Hello ${this.input.name}`;
    }),
  );

export const { onNewEmail } = greeter()
  .on("NewEmail")

  .run(
    Step("greet", function () {
      return this.thread.reply(`Hello ${this.thread.sender.name}!`);
    }),
  );

export const { Greeter } = greeter().service({
  hello,
  onNewEmail,
});

