import { Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

const { myAction } = myActor()
  .on("Command", "myAction")

  .input({ name: "string" })

  .run(
    Step("first step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: `Hello ${this.input.name}`,
      });
    }),
  );

export { myAction };

export const { MyActor } = myActor().service({ myAction });
