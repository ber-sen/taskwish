import { Actor, Agent, Step, Tool } from "../../src";
import { type } from "arktype";

export default Actor("Chat bot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .handler(
    Tool("wether", {
      description: "Get the weather in a location",
      inputSchema: type({
        location: type("string").describe(
          "The location to get the weather for",
        ),
      }),
      run: async ({ location }) => {
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
