import { Loop, End, Range, Actor, Message } from "../../src";

export default Actor("Say hello")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    Loop(Range(0, 10)),

    {
      name: "asdas",
      run: ({ action, input }) =>
        action.slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.user.name}?`,
        }),
    },

    Message("Message send to slack"),

    $ => 3,

    End(Loop)
  );
