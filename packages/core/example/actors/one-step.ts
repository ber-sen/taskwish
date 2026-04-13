import { Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor");

const { myAction } = MyActor()
  .on("Command", "myAction")

  .input({ name: "string" })

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: `Hello ${this.input.name}`,
      });
    }),
  );

export { myAction };
