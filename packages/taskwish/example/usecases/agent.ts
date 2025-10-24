import { UseCase, Agent } from "../../src";

export default UseCase("Chat bot")
  .trigger({ messages: { name: "string", age: "number" } })

  .steps(($) =>
    Agent("lorem")
      .configuration({
        system: "You are a helpful assistant.",
        model: "openai/gpt-4o",
      })
      .abilities()
      .on(["user reject"])

      .chat()
      // or
      .respond({ prompt: "asdasd" })
      // or
      .handle({ task: "asdasd" })
  );
