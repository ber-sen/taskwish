import { Agent, Step } from "taskwish";

import { actor } from "./basic-agent-loop";

export const { runBasicAgentLoop } = actor()
  .on("Command", "runBasicAgentLoop")

  .input({ goal: "string", "context?": "string" })

  .run(
    Agent({
      model: "ollama/qwen3:4b",
      instructions: "Think carefully, then choose a concrete next action.",
    }),

    Step("observe", function () {
      return {
        goal: this.input.goal,
        context: this.input.context ?? "No additional context was provided.",
      };
    }),

    Step("think", function () {
      return this.agent.generate({
        prompt: `Observation: ${JSON.stringify(
          this.observe
        )}\nReason about the best next action.`,
      });
    }),

    Step("act", function () {
      return this.agent.generate({
        prompt: `Goal: ${this.observe.goal}\nReasoning: ${this.think}\nReturn the concrete action to take now.`,
      });
    })
  )

  .meta({
    description: "Run an Observe → Think → Act agent loop",
    input: {
      goal: {
        description: "Goal the agent should advance",
        example: "Prepare a product launch",
      },
      context: {
        description: "Current situation the agent should observe",
        example: "The launch is in seven days",
      },
    },
  });
