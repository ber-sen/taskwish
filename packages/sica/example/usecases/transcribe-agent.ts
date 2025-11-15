import { UseCase } from "../../src";

export default UseCase("Chat bot")
  .use(import("../package"))

  .on({ message: "string[]"})

  .steps(({ agent, input }) => agent.translator.respond(input.message));
