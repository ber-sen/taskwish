import { Options, run, UseCase } from "../../src";

export default UseCase("Say hello")
  .on({ language: "string" })

  .steps(
    ["asdasd", ({ input }) => input],

    ({ asdasd }) =>
      run("Slack.sendMessage", {
        channel: "#general",
        text: `Does someone speak ${asdasd.language}?`,
        [Options]: [Options.timeout(40)],
      })
  );
