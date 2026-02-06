import { Source, Actor, Step } from "../../src";

export default Actor("Simple")
  .use(import("../package"))

  .run(function () {
    return this.run.Slack.sendMessage({
      channel: "#general",
      message: "Hello World",
    });
  });
