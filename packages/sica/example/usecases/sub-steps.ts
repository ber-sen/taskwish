import { Loop, End, Range, UseCase, Input } from "../../src";

export default UseCase("Sub steps")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    Input("Lorem", { name: "string" }),

    ({ action, input }) =>
      action.slack.sendMessage({
        channel: "#general",
        text: `Does someone speak ${input.user.age}?`,
      })
  )

  .steps(
    Loop(Range(0, 10)),

    ({ action, input }) =>
      action.slack.sendMessage({
        channel: "#general",
        text: `Does someone speak ${input.user.age}?`,
      }),

    ["Lorem", { name: "asdasd" }],

    End(Loop)
  );
