import { Loop, End, Range, Actor, Message, Step } from "../../src";

export default Actor("Say hello")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .handler(
    Step("first step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    }),

    Loop(
      () => Loop.Range(0, 10),

      Step("loop step", function () {
        return this.action.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      }),

      Step("loop step 2", function () {
        return this.action.slack.sendMessage({
          channel: "#general",
          message: "Hello World",
        });
      })
    ),

    Step("last step", function () {
      return this.action.slack.sendMessage({
        channel: "#general",
        message: "Hello World",
      });
    })
  );
