import { Actor, Step, Steps, SubSteps } from "../../src";

const Worker: Steps<typeof SubSteps> = {} as never;

export default Actor("Simple")
  .use(import("../package"))

  .run(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Worker(
      Step("second step", function () {
        return this.action.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("third step", function () {
        return this.action.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),
    ),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
