import { Actor } from "../../src";

export default Actor("Slack")
  .use(import("../package"))

  .on({ language: "string" })

  .steps(
    {
      name: "step middleware",
      type: ["action"],

      async *middleware({ input }, next) {
        const time = new Date().getTime();
        console.log("running action:", next.name);

        const res = yield* next();
        console.log("took:", new Date().getTime() - time);

        return res;
      },
    },

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
      run: ({ input }) =>
        action.Slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.language}?`,
        }),
    }
  );
