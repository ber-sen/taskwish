import { Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor").use(import("@taskwish/slack/postMessage"));

export const { sendMessage } = MyActor()
  .on("Command", "sendMessage")

  .run(
    Step("First step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: `Hello World`,
      });
    }),
  );
