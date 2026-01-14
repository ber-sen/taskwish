import { Actor, Parallel, Step } from "../../src";

export default Actor("Say hello")
  .use(import("../package"))

  .on({ user: { model: "string" } })

  .handler(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Parallel(
      Step("parallel first step", function () {
        return this.action.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("parallel last step", function () {
        return this.firstStep.length;
      })
    ),

    Step("last step", function () {
      return this.firstStep.length;
    })
  );
