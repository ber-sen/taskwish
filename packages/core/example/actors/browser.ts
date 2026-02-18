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
      Step("launchBrowser", {
        url: "Laptop Stand",
      }),

      Browser.Act("Click the login button"),
  
      Browser.Extract("lorem", {
        order_id: "string",
        total: "number",
        items: "string[]",
      }),
    ),

    Step("last step", function () {
      return this.lorem.total;
    }),
  );
