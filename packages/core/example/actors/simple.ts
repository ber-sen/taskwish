import { Actor, Step } from "../../src";

const { actor } = Actor("Example");

export const { sendMessage } = actor()
  .on("Command", "sendMessage")

  .run(
    Step("First step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: `Hello World`,
      });
    })
  );

export const { Example } = actor().service({ sendMessage });
