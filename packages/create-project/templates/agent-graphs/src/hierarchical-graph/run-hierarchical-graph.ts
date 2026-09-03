import { Agent, Step } from "taskwish";

import { actor } from "./hierarchical-graph";

export const { runHierarchicalGraph } = actor()
  .on("Command", "runHierarchicalGraph")

  .input({ objective: "string" })

  .run(
    Agent("manager", {
      model: "ollama/qwen3:4b",
      instructions: "Coordinate specialist teams and synthesize their results.",
    }),

    Agent("productLead", {
      model: "ollama/qwen3:4b",
      instructions: "Lead product analysis for a larger objective.",
    }),

    Agent("engineeringLead", {
      model: "ollama/qwen3:4b",
      instructions: "Lead engineering analysis for a larger objective.",
    }),

    Agent("specialist", {
      model: "ollama/qwen3:4b",
      instructions: "Complete a narrowly scoped analysis assigned by a team lead.",
    }),

    Step("delegateToLeads", function () {
      return this.manager.generate({
        prompt: `Objective: ${this.input.objective}\nCreate separate product and engineering assignments.`,
      });
    }),

    Step("runTeamSubgraphs", async function () {
      const [productPlan, engineeringPlan] = await Promise.all([
        this.productLead.generate({ prompt: this.delegateToLeads }),
        this.engineeringLead.generate({ prompt: this.delegateToLeads }),
      ]);
      const [productResult, engineeringResult] = await Promise.all([
        this.specialist.generate({ prompt: productPlan }),
        this.specialist.generate({ prompt: engineeringPlan }),
      ]);
      return { productResult, engineeringResult };
    }),

    Step("synthesizeTeams", function () {
      return this.manager.generate({
        prompt: `Objective: ${this.input.objective}\nTeam results:\n${JSON.stringify(this.runTeamSubgraphs)}`,
      });
    }),
  )

  .meta({
    description: "Delegate through team leads, execute leaf work, and aggregate upward",
    input: {
      objective: {
        description: "Objective for the hierarchy to solve",
        example: "Plan a self-service onboarding experience",
      },
    },
  });
