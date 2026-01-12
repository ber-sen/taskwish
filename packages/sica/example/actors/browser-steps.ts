import { Actor, Step } from "../../src";
import { SubSteps } from "../../src/steps/sub-steps";

const Browser: SubSteps = {} as never;

export default Actor("Simple")
  .use(import("../package"))

  .handler(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Browser.Steps(
      () => 3,
      
      Browser.Step("launchApp", {
        element: "Laptop Stand",
        centerElement: true,
      }),

      Step("mid d", function () {
        return this.action.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Browser.Step("tapOn", {
        element: "Laptop Stand",
        centerElement: true,
      })
    ),

    Step("last step", function () {
      return this.firstStep.length;
    })
  );
