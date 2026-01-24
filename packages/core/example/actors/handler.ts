import { Source, Actor, Step } from "../../src";

export default Actor("Simple")
  .use(import("../package"))

  .handler(function () {
    return this.action.slack.sendMessage({
      channel: "#general",
      message: "Hello World",
    });
  });
