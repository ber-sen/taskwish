import { Actor, Parallel, Step } from "../../src";

const { actor } = Actor("Example");

export const { parallel } = actor()
  .on("Command", "parallel")

  .input({ user: { model: "string" } })

  .run(
    Step("firstStep", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Parallel(
      Step("parallelFirstStep", function () {
        return this.actions.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("parallelLastStep", function () {
        return this.firstStep.length;
      })
    ),

    Step("lastStep", function () {
      return this.firstStep.length;
    })
  );

export const { Example } = actor().service({ parallel });
