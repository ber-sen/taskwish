import { UseCase } from "../../src";

export default UseCase("Chat bot")
  .use(import("../app"))

  .on({ message: "string[]"})

  .steps(({ agent, input }) => agent.translator.respond(input.message));
