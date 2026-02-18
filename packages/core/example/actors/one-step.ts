import { Actor, Step } from "../../src";

const { MyActor } = Actor("My actor");

const { myAction } = MyActor()
  .Action("My action")

  .on({ name: "string" })

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: `Hello ${this.input.name}`,
      });
    }),
  );

export { myAction };
