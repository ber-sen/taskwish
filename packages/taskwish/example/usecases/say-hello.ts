import { Options, run, UseCase } from "../../src";

export default UseCase("Say hello")
  .on({ language: "string" })

  .steps(
    ["asdasd", ($) => $.input],

    (scope) =>
      run("Slack.sendMessage", {
        channel: "#general",
        text: `Does someone speak ${scope.asdasd.language}?`,
        [Options]: [Options.timeout(40)],
      })
  );
