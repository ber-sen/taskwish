import { Loop, End, Range, UseCase } from "../../src";
import newEmail from "../events/new-email";

export default UseCase("Sub steps")
  .use(import("../package"))

  .on(newEmail)
  .on({ user: { name: "string", age: "number" } })
  .fn("Do something", { lorem: "string[]" })

  .steps(
    "fn:doSomething",

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

  .steps(
    "on:newEmail",
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

  .steps(
    "on:input",

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
