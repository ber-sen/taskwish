import { Loop, End, Range, UseCase, Input } from "../../src";

export default UseCase("Sub steps")
  .use(import("../package"))

  .action("Do something", { lorem: "string[]" })

  .steps(
    {
      name: "first",
      run: () => 3,
    },
    {
      name: "send message",
      type: "slack.send-message",
      run: ({ input }) => ({
        channel: "#general",
        text: `Does someone speak ${input.user.age}?`,
      }),
    }
  )

  .on({ user: { name: "string", age: "number" } })

  .steps(
    Loop(Range(0, 10)),

    {
      name: "send message",
      type: "slack.send-message",
      run: ({ input }) => ({
        channel: "#general",
        text: `Does someone speak ${input.user.age}?`,
      }),
    },

    {
      name: "send message",
      type: "self.do-something",
      run: ({ input }) => ({
        lorem: ["asd"],
      }),
    },

    End(Loop)
  );
