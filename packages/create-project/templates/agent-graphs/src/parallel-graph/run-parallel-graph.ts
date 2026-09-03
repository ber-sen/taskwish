import { Agent, Step } from "taskwish";

import { actor } from "./parallel-graph";

export const { runParallelGraph } = actor()
  .on("Command", "runParallelGraph")

  .input({ proposal: "string" })

  .run(
    Agent("riskReviewer", {
      model: "ollama/qwen3:4b",
      instructions: "Review proposals for delivery and operational risks.",
    }),

    Agent("userReviewer", {
      model: "ollama/qwen3:4b",
      instructions: "Review proposals from the end user's perspective.",
    }),

    Agent("technicalReviewer", {
      model: "ollama/qwen3:4b",
      instructions: "Review proposals for technical feasibility.",
    }),

    Agent("synthesizer", {
      model: "ollama/qwen3:4b",
      instructions: "Combine independent reviews into one recommendation.",
    }),

    Step("fanOutReviews", function () {
      const prompt = `Review this proposal:\n${this.input.proposal}`;
      return Promise.all([
        this.riskReviewer.generate({ prompt }),
        this.userReviewer.generate({ prompt }),
        this.technicalReviewer.generate({ prompt }),
      ]);
    }),

    Step("fanInRecommendation", function () {
      return this.synthesizer.generate({
        prompt: `Proposal: ${this.input.proposal}\nReviews:\n${this.fanOutReviews.join("\n---\n")}`,
      });
    }),
  )

  .meta({
    description: "Fan out independent reviews in parallel and join their results",
    input: {
      proposal: {
        description: "Proposal for multiple specialists to review",
        example: "Move the API to a new region",
      },
    },
  });
