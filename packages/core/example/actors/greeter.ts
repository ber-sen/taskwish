"use server";

import { Actor, Step, Event } from "../../src";

const { actor } = Actor("Greeter").scope(
  Event("UserWelcomed", { name: "string" })
);

export const { hello } = actor()
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
      return this.signal("UserWelcomed", { name: this.input.name });
    })
  );

const { onNewEmail } = actor()
  .on("NewEmail")

  .run(
    Step("greet", function () {
      return this.thread.reply(`Hello ${this.thread.sender.name}!`);
    })
  );

export const { Greeter } = actor().service({
  hello,
  onNewEmail,
});
