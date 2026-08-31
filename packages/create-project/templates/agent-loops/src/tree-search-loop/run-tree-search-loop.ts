import { Agent, Step } from "taskwish";

import { listItems, numericScore } from "../shared/text";
import { actor } from "./tree-search-loop";

export const { runTreeSearchLoop } = actor()
  .on("Command", "runTreeSearchLoop")

  .input({ goal: "string", "depth?": "number" })

  .run(
    Agent("explorer", {
      model: "openai/gpt-5-mini",
      instructions: "Generate exactly three distinct next actions, one per line.",
    }),

    Agent("evaluator", {
      model: "openai/gpt-5-mini",
      instructions: "Score one candidate from 0 to 100. Start with the numeric score.",
    }),

    Step("searchTree", async function () {
      const path: string[] = [];
      const explored: Array<Array<{ action: string; score: number }>> = [];
      const depth = Math.max(1, Math.min(this.input.depth ?? 3, 6));

      for (let level = 0; level < depth; level++) {
        const generated = await this.explorer.generate({
          prompt: `Goal: ${this.input.goal}\nCurrent path: ${JSON.stringify(path)}\nGenerate three possible next actions.`,
        });
        const actions = listItems(generated).slice(0, 3);
        const candidates = await Promise.all(actions.map(async (action) => ({
          action,
          score: numericScore(await this.evaluator.generate({
            prompt: `Goal: ${this.input.goal}\nPath: ${JSON.stringify(path)}\nCandidate: ${action}`,
          })),
        })));
        candidates.sort((left, right) => right.score - left.score);
        explored.push(candidates);
        if (candidates[0]) path.push(candidates[0].action);
      }

      return { bestPath: path, explored };
    }),
  )

  .meta({
    description: "Generate, evaluate, and follow the best branches in a small action tree",
    input: {
      goal: { description: "Goal that guides the search", example: "Reduce API latency" },
      depth: { description: "Number of tree levels to explore", example: 3 },
    },
  });
