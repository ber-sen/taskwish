import { Actor, Step } from "../../src";
import { SubSteps, SubStep } from "../../src/steps/sub-steps";

const Mobile = {
  Steps: {} as SubSteps,
  Step: {} as SubStep,
};

export default Actor("Simple")
  .use(import("../package"))

  .handler(
    Mobile.Steps(
      ($) => $.action,

      Step("if", function () {
        return 3;
      }),

      Mobile.Step("scrollUntilVisible", {
        element: "Laptop Stand",
        centerElement: true,
      }),

      Mobile.Step("tapOn", {
        text: "Add to Cart",
        below: "Laptop Stand",
      })
    ),

    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Step("last step", function () {
      return this.firstStep?.length;
    })
  );
