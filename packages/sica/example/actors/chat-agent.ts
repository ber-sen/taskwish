import z from "zod";
import { Actor, Agent, Step } from "../../src";
// import tsEvent from "../events/ts-event";

export default Actor("Chat bot")
  .use(import("../package"))

  .on({ tools: "string[]", prompt: "string" })

  .handler(
    // Tool("wether", {
    //   description: "Get the weather in a location",
    //   inputSchema: z.object({
    //     location: z.string().describe("The location to get the weather for"),
    //   }),
    //   execute: async ({ location }) => {
    //     return { temperature: 72, conditions: "sunny" };
    //   },
    // }),

    Agent("chat agent", {
      model: "anthropic/claude-sonnet-4.5",
      instructions: "You are an expert software engineer.",
      tools: ["wether"],
    }),

    Step("run", function () {
      return this.chatAgent.generateText();
    }),
  );
