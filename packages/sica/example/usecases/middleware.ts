import { UseCase } from "../../src";

export default UseCase("Slack")
  .use(import("../package"))

  .on({ language: "string" })

  .steps(
    {
      name: "LogMiddleware",
      wrap: ["action"],
      async *run({ input }, next) {
        const time = new Date().getTime();
        console.log("running action:", next.name);
        
        const res = yield* next();
        console.log("took:", new Date().getTime() - time);

        return res;
      },
    },

    {
      name: "send message",
      run({ action, input }) {
        action.slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.language}?`,
        });
      },
    },

    {
      name: "send message",
      run({ input }) {
        return action.slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.language}?`,
        });
      },
    }
  );
