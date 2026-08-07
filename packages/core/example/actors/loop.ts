import { Loop, ForEach, Actor, Step } from "../../src";

const { myActor } = Actor("MyActor");

export const { loop } = myActor()
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
      }),
    ),

    Step("last step", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),
  );

export const { MyActor } = myActor().service({ public: [loop] });
