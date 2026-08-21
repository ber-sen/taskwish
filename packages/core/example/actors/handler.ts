import { Actor } from "../../src";

const { actor } = Actor("Example");

export const { handle } = actor()
  .on("Command", "handle")

  .run(function () {
    return this.actions.slack.sendMessage({
      channel: "#general",
      message: "Hello World",
    });
  });

export const { Example } = actor().service({ handle });
