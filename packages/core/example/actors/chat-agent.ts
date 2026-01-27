import { Action, Actor, Agent, Step, Tool, Type } from "../../src";

export default Actor("Chat bot")
  .on({ prompt: Type("string", "User's prompt") })

  .handler(
    Tool("weather", {
      description: "Get the weather in a location",
      input: {
        location: Type("string", "The location to get the weather for"),
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
