import { Options } from "../../old";
import { UseCase } from "../../src";
import { run } from "../runner";

export default UseCase("Say hello")
  .on({ language: "string" })

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
