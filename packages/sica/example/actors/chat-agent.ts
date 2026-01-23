import { Actor, Agent,  Step } from "../../src";
// import tsEvent from "../events/ts-event";

export default Actor("Chat bot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .handler(
    Agent("chat agent", {
      model: "anthropic/claude-sonnet-4.5",
      instructions: "You are an expert software engineer.",
      tools: [
        function(){
          return this.scope.input
        }
      ]
    }),
    Step("run", function () {
      return this.chatAgent.generateText();
    }),
  );
