import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

export const { sendMessage } = myActor()
  .on("Command", "sendMessage")

  .run(
    Step("First step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: `Hello World`,
      });
    }),
  );

export const { MyActor } = myActor().service({ sendMessage });
