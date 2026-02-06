import { Actor, Step, Steps, SubSteps } from "../../src";

const Browser: Steps<typeof SubSteps> = {} as never;

export default Actor("Simple")
  .use(import("../package"))

  .run(
    Step("first step", function () {
      return this.run.Slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Browser(
      Step("launchApp", {
        element: "Laptop Stand",
        centerElement: true,
      }),

      Step("mid d", function () {
        return this.run.Slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("tapOn", {
        element: "Laptop Stand",
        centerElement: true,
      }),
    ),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
