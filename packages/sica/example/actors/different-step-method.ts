import { Source, Actor, Step } from "../../src";

export default Actor("Simple")
  .use(import("../package"))

  .handler(
    Step("if", function () {
      return 3
    }),

    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Step("last step", function () {
      return this.firstStep?.length;
    })
  );
