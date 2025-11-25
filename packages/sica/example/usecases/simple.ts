import { UseCase } from "../../src";

export default UseCase("Simple")
  .use(import("../package"))

  .steps(
    {
      name: "test",
      run: () => 3,
    },
    
    {
      name: "asds ipsum",
      run: ({ action, input }) =>
        action.slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.language}?`,
        }),
      options: [Source.pipeTo(Response)],
    }
  )

  .meta({ description: "Send a message to slack" });
