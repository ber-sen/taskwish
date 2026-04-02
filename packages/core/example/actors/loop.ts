import { Loop, Actor, Step } from "../../src";

const { MyActor } = Actor("MyActor");

export const { loop } = MyActor()
  .on("Command", "Loop")

  .input({ user: { name: "string", age: "number" } })

  .run(
    Step("first step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Loop(
      () => Loop.Range(0, 10),

      Step("gt", function () {
        return this.run.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("loop step 2", function () {
        return this.run.slack.sendMessage({
          channel: "#general",
          message: this.gt,
        });
      }),
    ),

    Step("last step", function () {
      return this.run.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),
  );
