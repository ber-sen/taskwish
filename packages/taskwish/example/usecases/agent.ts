import { UseCase, Agent } from "../../src";

export default UseCase("Chat bot")
  .trigger({ messages: { name: "string", age: "number" } })

  .steps(($) =>
    Agent("lorem")
      .describe("You are a helpful assistant.", {
        model: "openai/gpt-4o",
      })
      .abilities()
      .on(["user reject", $.input])

      .chat()
      // or
      .respond({ prompt: "asdasd" })
      // or
      .handle({ task: "asdasd" })
  );
