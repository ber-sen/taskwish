import { Agent, Step } from "taskwish";

import { listItems } from "../shared/text";
import { actor } from "./plan-execute-loop";

export const { runPlanExecuteLoop } = actor()
  .on("Command", "runPlanExecuteLoop")

  .input({ goal: "string" })

  .run(
    Agent("planner", {
      model: "openai/gpt-5-mini",
      instructions: "Create short, ordered plans. Return one step per line.",
    }),

    Agent("executor", {
      model: "openai/gpt-5-mini",
      instructions: "Execute one plan step and return its concrete result.",
    }),

    Step("createPlan", function () {
      return this.planner.generate({ prompt: `Create a plan for: ${this.input.goal}` });
    }),

    Step("executePlan", async function () {
      const results: string[] = [];
      for (const step of listItems(this.createPlan)) {
        results.push(await this.executor.generate({
          prompt: `Goal: ${this.input.goal}\nExecute this step: ${step}`,
        }));
      }
      return results;
    }),
  )

  .meta({
    description: "Create a plan and execute each of its steps",
    input: {
      goal: { description: "Goal to plan and execute", example: "Publish a technical article" },
    },
  });
