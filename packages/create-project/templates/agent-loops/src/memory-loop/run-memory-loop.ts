import { Agent, Step } from "taskwish";

import { actor } from "./memory-loop";

export const { runMemoryLoop } = actor()
  .on("Command", "runMemoryLoop")

  .input({ goal: "string" })

  .run(
    Agent({
      model: "openai/gpt-5-mini",
      instructions: "Use retrieved memories to reason, act, and summarize what should be remembered.",
    }),

    Step("retrieveMemory", function () {
      const words = this.input.goal.toLowerCase().split(/\W+/).filter(Boolean);
      return this.state.memories
        .filter((memory) => words.some((word) => memory.text.toLowerCase().includes(word)))
        .slice(-5);
    }),

    Step("reasonWithMemory", function () {
      return this.agent.generate({
        prompt: `Goal: ${this.input.goal}\nRelevant memories: ${JSON.stringify(this.retrieveMemory)}\nReason about the next action.`,
      });
    }),

    Step("actFromMemory", function () {
      return this.agent.generate({
        prompt: `Goal: ${this.input.goal}\nReasoning: ${this.reasonWithMemory}\nReturn the action taken and its outcome.`,
      });
    }),

    Step("storeMemory", function () {
      this.state.memories.push({
        text: `Goal: ${this.input.goal}\nOutcome: ${this.actFromMemory}`,
      });
      return {
        result: this.actFromMemory,
        stored: this.state.memories.at(-1)!,
      };
    }),
  )

  .meta({
    description: "Retrieve memories, reason and act, then store the outcome",
    input: {
      goal: { description: "Goal used for retrieval and action", example: "Improve the release checklist" },
    },
  });
