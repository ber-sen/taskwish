import { UseCase } from "../../src";

export default UseCase("Chat bot")
  .on({ messages: { name: "string", age: "number" } })

  .steps(($) =>
    run("AI:chat", {
      identity: "You are a helpful assistant.",
      model: "openai/gpt-4o",
      messages: $.input.messages,
      connections: [["Marketing agent", { identity: "asdad" }]],
      abilities: [["send slack message", "Slack:send-message"]],
    }),
  );
