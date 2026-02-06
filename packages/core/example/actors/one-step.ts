import { Source, Actor, Step } from "../../src";

export default Actor("Simple")
  .use(import("../package"))

  .run(
    Step("first step", function () {
      return this.run.Slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    })
  );
