"use server";

import { Actor, Step } from "../../src";

/* start Service */
/* start Actor */
export const { Greeter } = Actor("Greeter");
/* end Actor */

// Action
export const { hello } = Greeter()
  .on("Command", "hello")

  .input({ name: "string" })

  .run(function () {
    return this.actions.slack.sendMessage({
      channel: "#general",
      message: "Hello",
    });
  });

// Action
export const { bye } = Greeter()
  .on("Command", "bye")

  .input({ name: "string" })

  .run(
    Step("First", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: "Bye",
      });
    }),

    Step("Final", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: "Until next time!",
      });
    }),
  );

/* end Service */
