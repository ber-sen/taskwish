import { Agent, Step } from "taskwish";

import { ollamaModel } from "../shared/ollama";

import { passedEvaluation } from "../shared/text";
import { actor } from "./evaluator-optimizer-loop";

export const { runEvaluatorOptimizerLoop } = actor()
  .on("Command", "runEvaluatorOptimizerLoop")

  .input({ task: "string", "maxIterations?": "number" })

  .run(
    Agent("generator", {
      model: ollamaModel,
      instructions: "Generate a strong candidate answer.",
    }),

    Agent("evaluator", {
      model: ollamaModel,
      instructions: "Evaluate against the task. Start with PASS or IMPROVE, then explain.",
    }),

    Agent("optimizer", {
      model: ollamaModel,
      instructions: "Optimize a candidate using evaluator feedback.",
    }),

    Step("generateCandidate", function () {
      return this.generator.generate({ prompt: this.input.task });
    }),

    Step("evaluateAndOptimize", async function () {
      let candidate = this.generateCandidate;
      const history: Array<{ candidate: string; evaluation: string }> = [];
      const iterations = Math.max(1, Math.min(this.input.maxIterations ?? 3, 8));

      for (let iteration = 0; iteration < iterations; iteration++) {
        const evaluation = await this.evaluator.generate({
          prompt: `Task: ${this.input.task}\nCandidate:\n${candidate}`,
        });
        history.push({ candidate, evaluation });
        if (passedEvaluation(evaluation)) break;
        candidate = await this.optimizer.generate({
          prompt: `Task: ${this.input.task}\nCandidate:\n${candidate}\nEvaluation:\n${evaluation}\nReturn an optimized candidate.`,
        });
      }

      return { candidate, history };
    }),
  )

  .meta({
    description: "Generate, evaluate, and optimize until accepted or capped",
    input: {
      task: { description: "Task whose output should be optimized", example: "Write a concise launch announcement" },
      maxIterations: { description: "Maximum evaluation cycles", example: 3 },
    },
  });
