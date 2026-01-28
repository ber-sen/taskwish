import { Actor, Step, Steps, SubSteps } from "../../src";

const Browser = {
  Steps: {} as Steps<typeof SubSteps>,
};

export default Actor("Simple")
  .use(import("../package"))

  .run(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Browser.Steps(
      Step("launchApp", {
        element: "Laptop Stand",
        centerElement: true,
      }),

      Step("mid d", function () {
        return this.action.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("tapOn", {
        element: "Laptop Stand",
        centerElement: true,
      })
    ),

    Step("last step", function () {
      return this.firstStep.length;
    })
  );
