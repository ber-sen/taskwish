import { Source, Actor } from "../../src";

export default Actor("SayHello")
  .use(import("../package"))

  .on({ language: "string" })

  .steps(
    {
      name: "first",
      run: () => 3,
    },

    {
      name: "send message",
      options: [Source.pipeTo(Response)],
      description: "Send a message to slack",
      
      run: ({ action, input }) =>
        action.slack.sendMessage({
          channel: "#general",
          text: `Does someone speak ${input.language}?`,
        }),
    }
  )

  .meta({
    description: "Send hello message to slack",
    input: { language: "Hello language" },
  });
