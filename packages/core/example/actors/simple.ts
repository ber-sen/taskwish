import { Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor");

const { sendMessage } = MyActor()
  .Action("Send message")

  .run(
    Step("First step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: `Hello World`,
      });
    }),
  );

export { sendMessage };
