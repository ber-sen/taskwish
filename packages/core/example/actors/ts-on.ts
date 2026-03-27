import { Actor, Step } from "../../src";

const { MyActor } = Actor("My actor");

export const { runSteps } = MyActor()
  .on("command", "Run steps")

  .input<{ message: string }>()

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
