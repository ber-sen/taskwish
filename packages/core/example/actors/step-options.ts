import { Actor, Step } from "../../src";

const StepOptions = {
  Retry:
    (_times: number) =>
    <T>(R: T) =>
      R,
};

const { actor } = Actor("Example");

export const { withOptions } = actor()
  .on("Command", "withOptions")

  .input({ message: "string" })

  .run(
    Step("firstStep", [
      function () {
        return this.actions.slack.sendMessage({
          channel: "#general",
          message: this.input.message,
        });
      },
      StepOptions.Retry(5),
    ]),

    Step("lastStep", function () {
      return this.firstStep.length;
    })
  );

export const { Example } = actor().service({ withOptions });
