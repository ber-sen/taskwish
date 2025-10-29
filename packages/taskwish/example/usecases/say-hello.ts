import { UseCase } from "../../src";

export default UseCase("Say hello")
  .on({ language: "string" })

  .describe("Send hello message to slack", {
    input: { language: "Hello language" },
  })

  .steps(
    ["asdasd", ({ input }) => input],

    ({ action }) =>
      action.slack.sendMessage({
        channel: "#general",
        text: `Does someone speak ${asdasd.language}?`,
      }),
  );
