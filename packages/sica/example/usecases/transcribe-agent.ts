import { UseCase } from "../../src";

export default UseCase("Chat bot")
  .use(import("../agents"))

  .on({ message: "string[]"})

  .steps(({ agent, input }) => agent.translator.respond(input.message));
