import { UseCase } from "../../src";

export default UseCase("Chat bot")
  .use(import("../agents", { with: { type: "raw" } }))

  .on({ messages: { name: "string", age: "number" } })

  .steps(({ agent, input }) => agent.marketing.chat(input.messages));
