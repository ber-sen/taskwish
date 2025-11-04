import { UseCase } from "../../src";
import tsEvent from "../events/ts-event";

export default UseCase("Chat bot")
  .use(import("../app"))

  .on(tsEvent)

  .steps(({ agent, input }) => agent.marketing.chat(input.name));


