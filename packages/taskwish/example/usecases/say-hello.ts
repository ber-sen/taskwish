import { Options, run, UseCase } from "../../src";

export default UseCase("Say hello")
  .trigger({ language: "string" })

  .describe("Send hello message to slack", {
    input: { language: "Hello language" },
  })

  .steps(
    ["asdasd", ({ input }) => input],

    ({ asdasd }) =>
      run("Slack.sendMessage", {
        channel: "#general",
        text: `Does someone speak ${asdasd.language}?`,
        [Options]: [Options.timeout(40)],
      })
  );
