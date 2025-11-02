import { UseCase } from "../../src";
import tsEvent from "../events/ts-event";

export default UseCase("Chat bot")
  .use(import("../agents", { with: { type: "raw" } }))

  .on(tsEvent)

  .steps(({ agent, input }) => agent.marketing.chat(input.name));


