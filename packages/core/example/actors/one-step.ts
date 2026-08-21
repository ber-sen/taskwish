import { Actor, Step } from "../../src";

const { actor } = Actor("Example");

const { myAction } = actor()
  .on("Command", "myAction")

  .input({ name: "string" })

  .run(
    Step("first step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: `Hello ${this.input.name}`,
      });
    })
  );

export { myAction };

export const { Example } = actor().service({ myAction });
