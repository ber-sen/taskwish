import { Actor, Step, Steps, SubSteps, Config } from "../../src";

const Workflow: Steps<typeof SubSteps> = {} as never;

export default Actor("Simple")
  .use(import("../package"))

  .run(
    Step("first step", function () {
      return this.actions.Slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Workflow(
      "My workflow",

      Step("launchApp", {
        element: "Laptop Stand",
        centerElement: true,
      }),

      Step("mid d", function () {
        return this.actions.Slack.sendMessage({
          [Config]: "lorem@ipsum.com:workspace",
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("tapOn", {
        element: "Laptop Stand",
        centerElement: true,
      }),
    ), // runs workflow on bg

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
