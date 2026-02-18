import { Actor, Agent, Describe, Step, Tool, Type } from "../../src";

const { ChatBot } = Actor("Chat bot");

export const { chat } = ChatBot()
  .Action("Chat")

  .on({ prompt: Describe("string", "User's prompt") })

  .run(
    Tool("weather", {
      description: "Get the weather in a location",
      input: {
        location: Describe("string", "The location to get the weather for"),
      },
      run() {
        console.log(this.input.location);

        return { temperature: 72, conditions: "sunny" };
      },
    }),

    Agent("chat agent", {
      model: "anthropic/claude-sonnet-4.5",
      instructions: "You are an expert software engineer.",
      tools: ["weather"],
    }),

    Step("run", function () {
      return this.chatAgent({ prompt: this.input.prompt });
    }),
  );
