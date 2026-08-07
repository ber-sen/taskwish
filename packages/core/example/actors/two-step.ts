import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

export const { runSteps } = myActor()
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

export const { MyActor } = myActor().service({ public: [runSteps] });
