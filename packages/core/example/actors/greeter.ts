"use server";

import { Actor, Step, Event } from "../../src";

export const { Greeter } = Actor("Greeter", [
  Event("UserWelcomed").data({
    name: "string",
  }),
]);

export const { hello } = Greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(
    Step("greet", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: `Hello ${this.input.name}`,
      });
    }),

    Step("notify", function () {
      return this.emit("UserWelcomed", { name: this.input.name });
    }),
  );

Greeter()
  .on("NewEmail")

  .run(
    Step("greet", function () {
      return this.thread.reply(`Hello ${this.thread.sender.name}!`);
    }),
  );
