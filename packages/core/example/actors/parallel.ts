import { Actor, Parallel, Step } from "../../src";

const { MyActor } = Actor("My actor");

export const { parallel } = MyActor()
  .on("command", "Parallel")

  .input({ user: { model: "string" } })

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Parallel(
      Step("parallel first step", function () {
        return this.run.slack.sendMessage({
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
