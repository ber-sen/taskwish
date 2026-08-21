import { Actor, Step } from "../../src";

const { actor } = Actor("Example");

export const { runSteps } = actor()
  .on("Command", "Run steps")

  .input<{ message: string }>()

  .run(
    Step("first step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: this.input.message,
      });
    }),

    Step("last step", function () {
      return this.firstStep.length;
    })
  );

export const { Example } = actor().service({ runSteps });
