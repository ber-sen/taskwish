import { Actor } from "../../src";

export default Actor("Chat bot")
  .use(import("../package"))

  .on({ message: "string[]"})

  .steps(({ agent, input }) => agent.translator.respond(input.message));
