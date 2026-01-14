import { Actor, Agent, Step } from "../../src";
// import tsEvent from "../events/ts-event";

export default Actor("Chat bot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .handler(
    Agent("Lorem agent", Agent.Model("launchApp"), Agent.Model("tapOn")),
    Agent.Run("lorem agent", {})
  );
