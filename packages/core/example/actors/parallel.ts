import { Actor, Parallel, Step } from "../../src";

const { myActor } = Actor("My actor");

export const { parallel } = myActor()
  .on("Command", "parallel")

  .input({ user: { model: "string" } })

  .run(
    Step("first step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Parallel(
      Step("parallel first step", function () {
        return this.actions.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("parallel last step", function () {
        return this.firstStep.length;
      }),
    ),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );

export const { MyActor } = myActor().service({ public: [parallel] });
