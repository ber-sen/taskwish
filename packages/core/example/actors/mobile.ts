import { Actor, Step, Steps, SubSteps } from "../../src";

const Mobile = {} as Steps<typeof SubSteps>

export default Actor("Simple")
  .use(import("../package"))

  .run(
    Step("firstStep", function () {
      return this.actions.Slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Mobile(
      Step("launchApp", "com.inditex.zara"),
      Step("tapOn", "Enter"),
      Step("tapOn", "Accept all cookies"),
      Step("scroll"),
      Step("tapOn", "Menu"),
      Step("tapOn", {
        id: "container-id",
        index: 2,
      }),
      Step("endMob", function () {
        return 3;
      }),
    ),

    Step("lastStep", function () {
      return this.firstStep.length;
    }),
  );
