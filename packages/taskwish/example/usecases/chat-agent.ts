import { UseCase } from "../../src";

export default UseCase("Chat bot")
  .on({ messages: { name: "string", age: "number" } })

  .steps(($) =>
    run("Agent.chat", {
      system: "You are a helpful assistant.",
      model: "openai/gpt-4o",
      messages: $.input.messages,
    }),
  );
