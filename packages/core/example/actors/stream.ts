import { Actor, Step, Steps, SubSteps } from "../../src";

const Stream: Steps<typeof SubSteps> = {} as never;

const { MyActor } = Actor("MyActor");

export const { stream } = MyActor()
  .on("Command", "stream")

  .run(
    Stream(
      Step("First step", function () {
        return true;
      }),

      Step("Mid step", function () {
        return this.actions.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("End step", function () {
        return this.midStep;
      }),
    ),
  );
