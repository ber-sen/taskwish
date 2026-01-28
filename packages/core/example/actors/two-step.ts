import { Actor, Step } from "../../src";

export default Actor("Simple")
  .use(import("../package"))

  .on({ message: "string" })

  .run(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: this.input.message,
      });
    }),

    Step("last step", function () {
      return this.firstStep.length;
    }),
  );
