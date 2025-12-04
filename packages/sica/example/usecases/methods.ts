import { Loop, End, Range, UseCase } from "../../src";
import newEmail from "../events/new-email";

export default UseCase("Sub steps")
  .use(import("../package"))

  .on("Do something", { lorem: "string[]" })

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

  .on(newEmail)
  
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

  .on("asdas", { user: { name: "string", age: "number" } })

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
