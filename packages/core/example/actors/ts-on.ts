import { Actor, Step } from "../../src";

const { myActor } = Actor("My actor");

export const { runSteps } = myActor()
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
    }),
  );

export const { MyActor } = myActor().service({ public: [runSteps] });
