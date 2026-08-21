import { Loop, ForEach, Actor, Step } from "../../src";

const { actor } = Actor("Example");

export const { loop } = actor()
  .on("Command", "loop")

  .input({ user: { name: "string", age: "number" } })

  .run(
    Step("first step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Loop(
      ForEach({ range: [0, 10] }),

      Step("gt", function () {
        return this.actions.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("loop step 2", function () {
        return this.actions.slack.sendMessage({
          channel: "#general",
          message: this.gt,
        });
      })
    ),

    Step("last step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    })
  );

export const { Example } = actor().service({ loop });
