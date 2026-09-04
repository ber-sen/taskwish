import { Loop, Actor } from "../../src";
import newEmail from "../events/new-email";

export default Actor("SubSteps")
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
        action.Slack.sendMessage({
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
        action.Slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.language}?`,
        }),
    }
  )

  .on({ user: { name: "string", age: "number" } })

  .run(
    Loop(
      ForEach({ range: [0, 10] }),

      {
        name: "send message",
        run: ({ action, input }) =>
          action.Slack.sendMessage({
            channel: "#general",
            text: `Does someone speak ${input.language}?`,
          }),
      },

      {
        name: "send message",
        run: ({ self }) => self.doSomething({ lorem: ["asd"] }),
      }
    )
  );
