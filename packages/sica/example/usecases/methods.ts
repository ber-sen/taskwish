import { Loop, End, Range, UseCase, Input } from "../../src";

export default UseCase("Sub steps")
  .use(import("../package"))

  .action("Do something", { lorem: "string[]" })

  .steps(
    ({ action, input }) =>
      action.slack.sendMessage({
        channel: "#general",
        text: `Does someone speak ${input.user.age}?`,
      })
  )

  .on({ user: { name: "string", age: "number" } })

  .steps(
    Loop(Range(0, 10)),

    ({ action, input }) =>
      action.slack.sendMessage({
        channel: "#general",
        text: `Does someone speak ${input.user.age}?`,
      }),

    ({ self }) => self.doSomething({ lorem: ["asd"] }),

    End(Loop)
  );
