import { Actor, Step } from "../../src";

const { actor } = Actor("Example");

export const { runSteps } = actor()
  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("firstStep", function () {
      return "step 1";
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    })
  );

export const { Example } = actor().service({ runSteps });
