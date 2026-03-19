import { Actor, Step, Steps, SubSteps } from "../../src";

const Stream: Steps<typeof SubSteps> = {} as never;

const { MyActor } = Actor("My Actor");

export const { stream } = MyActor()
  .on("Command", "Stream")

  .run(
    Stream(
      Step("First step", function () {
        return true;
      }),

      Step("Mid step", function () {
        return this.run.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("End step", function () {
        return this.midStep;
      }),
    ),
  );
