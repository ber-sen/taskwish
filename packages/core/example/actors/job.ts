import { Actor, Step, Steps, SubSteps } from "../../src";

const Job: Steps<typeof SubSteps> = {} as never;

export default Actor("Simple")
  .use(import("../package"))

  .run(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Job(
      "lorem",

      Step("last step", function () {
        return this.firstStep.length;
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
        Step("end mob", function () {
          return 3;
        }),
      ),
    ),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
