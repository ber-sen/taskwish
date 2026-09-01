import { Agent, Step } from "taskwish";

import { ollamaModel } from "../shared/ollama";

import { actor } from "./goal-driven-loop";

export const { runGoalDrivenLoop } = actor()
  .on("Command", "runGoalDrivenLoop")

  .input({ goal: "string", "requiredActions?": "number" })

  .run(
    Agent({
      model: ollamaModel,
      instructions: "Choose the single best next action given a goal and progress so far.",
    }),

    Step("actUntilSatisfied", async function () {
      const requiredActions = Math.max(1, Math.min(this.input.requiredActions ?? 3, 10));
      const actions: string[] = [];

      while (actions.length < requiredActions) {
        actions.push(await this.agent.generate({
          prompt: `Goal: ${this.input.goal}\nCompleted actions: ${JSON.stringify(actions)}\nChoose the next action.`,
        }));
      }

      return { goal: this.input.goal, satisfied: true, actions };
    }),
  )

  .meta({
    description: "Choose actions repeatedly until the goal condition is satisfied",
    input: {
      goal: { description: "Goal to satisfy", example: "Prepare a release" },
      requiredActions: { description: "Example completion condition", example: 3 },
    },
  });
