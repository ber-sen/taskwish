import { Actor } from "../../src";

const { myActor } = Actor("MyActor");

export const { handle } = myActor()
  .on("Command", "handle")

  .run(function () {
    return this.actions.slack.sendMessage({
      channel: "#general",
      message: "Hello World",
    });
  });

export const { MyActor } = myActor().service({ handle });
