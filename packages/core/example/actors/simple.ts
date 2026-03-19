import { Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor");

export const { sendMessage } = MyActor()
  .on("Command", "Send message")

  .run(
    Step("First step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: `Hello World`,
      });
    }),
  );
