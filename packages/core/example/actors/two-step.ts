import { Actor, Desc, Step, Taskwish } from "../../src";

const { MyActor } = Actor("My actor");

export const { runSteps } = MyActor()
  .on("Command", "Run steps")

  .input({ message: ["string", Desc`Slack message`] })

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: this.input.message[0],
      });
    }),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
