import { Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor");

export const { runSteps } = MyActor()
  .on("Command", "runSteps")

  .input({ message: "string" })

  .run(
    Step("firstStep", function () {
      return "step 1";
    }),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );
