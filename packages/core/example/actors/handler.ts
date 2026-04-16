import { Actor } from "../../src";

const { MyActor } = Actor("MyActor");

export const { handle } = MyActor()
  .on("Command", "handle")

  .run(function () {
    return this.actions.slack.sendMessage({
      channel: "#general",
      message: "Hello World",
    });
  });
