import { Agent, Step } from "taskwish";

import { listItems } from "../shared/text";
import { actor } from "./map-reduce-graph";

export const { runMapReduceGraph } = actor()
  .on("Command", "runMapReduceGraph")

  .input({ topic: "string" })

  .run(
    Agent("planner", {
      model: "ollama/qwen3:4b",
      instructions: "Split a topic into three independent research questions, one per line.",
    }),

    Agent("worker", {
      model: "ollama/qwen3:4b",
      instructions: "Research one bounded question and return concise findings.",
    }),

    Agent("reducer", {
      model: "ollama/qwen3:4b",
      instructions: "Reduce several findings into a coherent answer.",
    }),

    Step("planDynamicBranches", async function () {
      return listItems(
        await this.planner.generate({
          prompt: `Create research questions for: ${this.input.topic}`,
        }),
      ).slice(0, 6);
    }),

    Step("mapBranches", function () {
      return Promise.all(
        this.planDynamicBranches.map((question) =>
          this.worker.generate({ prompt: question }),
        ),
      );
    }),

    Step("reduceFindings", function () {
      return this.reducer.generate({
        prompt: `Topic: ${this.input.topic}\nFindings:\n${this.mapBranches.join("\n---\n")}`,
      });
    }),
  )

  .meta({
    description: "Create dynamic worker branches and reduce their outputs",
    input: {
      topic: {
        description: "Topic to decompose into dynamic work",
        example: "Compare database migration strategies",
      },
    },
  });
