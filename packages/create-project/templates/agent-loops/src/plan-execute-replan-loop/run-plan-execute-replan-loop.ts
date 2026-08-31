import { Agent, Step } from "taskwish";

import { listItems } from "../shared/text";
import { actor } from "./plan-execute-replan-loop";

export const { runPlanExecuteReplanLoop } = actor()
  .on("Command", "runPlanExecuteReplanLoop")

  .input({ goal: "string" })

  .run(
    Agent("planner", {
      model: "openai/gpt-5-mini",
      instructions: "Create an ordered plan with one step per line.",
    }),

    Agent("executor", {
      model: "openai/gpt-5-mini",
      instructions: "Execute a single plan step and report what happened.",
    }),

    Agent("replanner", {
      model: "openai/gpt-5-mini",
      instructions: "Revise the remaining plan after seeing execution results. Return one step per line.",
    }),

    Step("createPlan", function () {
      return this.planner.generate({ prompt: `Plan this goal: ${this.input.goal}` });
    }),

    Step("executeFirstStep", async function () {
      const [firstStep = this.input.goal] = listItems(this.createPlan);
      return {
        step: firstStep,
        result: await this.executor.generate({ prompt: `Execute: ${firstStep}` }),
      };
    }),

    Step("replan", function () {
      return this.replanner.generate({
        prompt: `Goal: ${this.input.goal}\nOriginal plan:\n${this.createPlan}\nCompleted: ${JSON.stringify(this.executeFirstStep)}\nRevise the remaining plan.`,
      });
    }),

    Step("executeRevisedPlan", async function () {
      const results: string[] = [];
      for (const step of listItems(this.replan)) {
        results.push(await this.executor.generate({ prompt: `Execute revised step: ${step}` }));
      }
      return { first: this.executeFirstStep, revisedPlan: this.replan, results };
    }),
  )

  .meta({
    description: "Create a plan, execute, then dynamically revise and continue",
    input: {
      goal: { description: "Goal whose plan may need revision", example: "Migrate a service with minimal downtime" },
    },
  });
