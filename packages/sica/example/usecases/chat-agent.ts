import { Message, UseCase } from "../../src";
// import tsEvent from "../events/ts-event";

export default UseCase("Chat bot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .use({
    tools: ({ input, tools }) =>
      tools.filter((tool) => input.tool.includes(tool.name)),
  })

  .agent(
    "marketing",

    Message.System("You are a helpful marketing assistent called Boria"),
    Message.User("asdasd"),

    ($) => $.tools
  )

  .steps({
    run: ({ agent, input }) => agent.marketing.chat({ prompt: input.prompt }),
  });
