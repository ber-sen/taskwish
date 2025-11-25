import { Loop, End, Range, UseCase, Input } from "../../src";

export default UseCase("Sub steps")
  .use(import("../package"))

  .fn("Do something", { lorem: "string[]" })

  .steps(
    {
      name: "first",
      run: () => 3,
    },
    {
      name: "send message",
      run: ({ action, input }) =>
        action.slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.language}?`,
        }),
    }
  )

  .on({ user: { name: "string", age: "number" } })

  .steps(
    Loop(Range(0, 10)),

    {
      name: "send message",
      run: ({ action, input }) =>
        action.slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.language}?`,
        }),
    },

    {
      name: "send message",
      run: ({ self }) => self.doSomething({ lorem: ["asd"] }),
    },

    End(Loop)
  );
