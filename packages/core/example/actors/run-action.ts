import { Actor, Step } from "../../src";

export default Actor("Simple")
  .use(import("../package"))

  .handler(
    Step.Run(["slack.sendMessage", "first step"], {
      channel: "#general",
      message: "Hello World",
    }),

    Step("last step", function () {
      return this.firstStep.length;
    })
  );

  