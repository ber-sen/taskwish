import { Actor } from "../../src";

export default Actor("ChatBot")
  .use(import("../package"))

  .on({ message: "string[]"})

  .steps(({ agent, input }) => agent.translator.respond(input.message));
