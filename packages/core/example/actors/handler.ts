import { Source, Actor, Step } from "../../src";

export default Actor("Simple")
  .use(import("../package"))

  .run(function () {
    return this.run.slack.sendMessage({
      channel: "#general",
      message: "Hello World",
    });
  });
