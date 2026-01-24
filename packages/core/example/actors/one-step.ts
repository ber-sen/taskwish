import { Source, Actor, Step } from "../../src";

export default Actor("Simple")
  .use(import("../package"))

  .handler(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    })
  );
