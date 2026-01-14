import { Actor, Step } from "../../src";
import { SubSteps, SubStep } from "../../src/steps/sub-steps";

const Mobile = {
  Steps: {} as SubSteps,
  Step: {} as SubStep,
};

export default Actor("Simple")
  .use(import("../package"))

  .handler(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Mobile.Steps(
      Mobile.Step("launchApp", "com.inditex.zara"),
      Mobile.Step("tapOn", "Enter"),
      Mobile.Step("tapOn", "Accept all cookies"),
      Mobile.Step("scroll"),
      Mobile.Step("tapOn", "Menu"),
      Mobile.Step("tapOn", {
        id: "container-id",
        index: 2,
      })
    ),

    Step("last step", function () {
      return this.firstStep.length;
    })
  );
