import { Actor } from "../../src";

const { MyActor } = Actor("My actor");

export const { handle } = MyActor()
  .Action("Handle")

  .run(function () {
    return this.run.slack.sendMessage({
      channel: "#general",
      message: "Hello World",
    });
  });
