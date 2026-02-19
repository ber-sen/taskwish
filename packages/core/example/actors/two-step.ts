import { Actor, Desc, Step } from "../../src";

const { MyActor } = Actor("My actor");

export const { runSteps } = MyActor()
  .Action("Run steps")

  .on({ message: ["string", Desc`Slack message`] })

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: this.input.message,
      });
    }),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
