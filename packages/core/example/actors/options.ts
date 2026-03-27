import { Actor, Step } from "../../src";

const Options = {
  retry:
    (times: number) =>
    <T>(R: T) =>
      R,
};

const { MyActor } = Actor("My actor");

export const { withOptions } = MyActor()
  .on("command", "With options")
  
  .input({ message: "string" })

  .run(
    Step("first step", [
      function () {
        return this.run.slack.sendMessage({
          channel: "#general",
          message: this.input.message,
        });
      },
      Options.retry(5),
    ]),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
