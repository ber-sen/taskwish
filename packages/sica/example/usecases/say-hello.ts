import { UseCase } from "../../src";

export default UseCase("Say hello")
  .use(import("../package"))

  .on({ language: "string" })

  .describe("Send hello message to slack", {
    input: { language: "Hello language" },
  })

  .steps(
    {
      name: "first",
      run: () => 3,
    },
    {
      name: "asds ipsum",
      run: ({ action, input }) =>
        action.slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.language}?`,
        }),
      option: [Source.pipeTo(Response)],
    }
  );
