import { End, UseCase, If, Agent } from "../../src";

export default UseCase("Chat bot")
  .on({ messages: { name: "string", age: "number" } })

  .steps(($) =>
    Agent("lorem", {
      model: "openai/gpt-4o",
      system: "You are a helpful assistant.",
    })
      .abilities()

      .chat()

      .on(["user reject", $.input])
  );
