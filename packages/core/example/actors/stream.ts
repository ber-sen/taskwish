import { Actor, Step, Steps, SubSteps } from "../../src";

const Stream: Steps<typeof SubSteps> = {} as never


export default Actor("Simple")
  .use(import("../package"))

  .run(
    Stream(
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
      })
    )
  );
