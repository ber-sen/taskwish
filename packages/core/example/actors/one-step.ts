import { Actor, Step } from "../../src";

const { MyActor } = Actor("My actor");

const { myAction } = MyActor()
  .on("command", "My action")

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
