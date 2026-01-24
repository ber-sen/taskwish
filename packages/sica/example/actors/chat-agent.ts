import { Actor, Agent, Step, Tool } from "../../src";

export default Actor("Chat bot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .handler(
    Tool("wether", {
      description: "Get the weather in a location",
      input: {
        location: "string"
      },
      run() {
        console.log(this.input.location)
        
        return { temperature: 72, conditions: "sunny" };
      },
    }),

    Agent("chat agent", {
      model: "anthropic/claude-sonnet-4.5",
      instructions: "You are an expert software engineer.",
      tools: ["wether"],
    }),

    Step("run", function () {
      return this.chatAgent.generateText();
    }),
  );
