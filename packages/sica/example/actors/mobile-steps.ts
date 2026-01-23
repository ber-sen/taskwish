import { Actor, Step, Steps, SubSteps } from "../../src";

const Mobile = {
  Steps: {} as Steps<typeof SubSteps>,
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
      Step("launchApp", "com.inditex.zara"),
      Step("tapOn", "Enter"),
      Step("tapOn", "Accept all cookies"),
      Step("scroll"),
      Step("tapOn", "Menu"),
      Step("tapOn", {
        id: "container-id",
        index: 2,
      }),
      Step("end mob", function () {
        return 3;
      }),
    ),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
