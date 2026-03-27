import { Actor, Agent, Desc, Step, Tool, Type } from "../../src";

const { ChatBot } = Actor("Chat bot");

export const { chat } = ChatBot()
  .on("Command", "chat")

  .input({ prompt: ["string", Desc`User's prompt`] })

  .run(
    Tool("weather", {
      description: "Get the weather in a location",
      input: {
        location: ["string", Desc`The location to get the weather for`],
      },
      run() {
        console.log(this.input.location);

        return { temperature: 72, conditions: "sunny" };
      },
    }),
    
    Agent("chatAgent", {
      model: "anthropic/claude-sonnet-4.5",
      instructions: "You are an expert software engineer.",
      tools: ["weather"],
    }),

    Step("run", function () {
      return this.chatAgent({ prompt: this.input.prompt });
    }),
  );
