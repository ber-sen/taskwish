import { Actor, Step } from "../../src";

const Options = {
  retry:
    (times: number) =>
    <T>(R: T) =>
      R,
};

const { myActor } = Actor("MyActor");

export const { withOptions } = myActor()
  .on("Command", "withOptions")
  
  .input({ message: "string" })

  .run(
    Step("first step", [
      function () {
        return this.actions.slack.sendMessage({
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

export const { MyActor } = myActor().service({ withOptions });
