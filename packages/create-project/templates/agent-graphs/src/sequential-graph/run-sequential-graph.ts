import { Agent, Step } from "taskwish";

import { actor } from "./sequential-graph";

export const { runSequentialGraph } = actor()
  .on("Command", "runSequentialGraph")

  .input({ brief: "string" })

  .run(
    Agent("researcher", {
      model: "ollama/qwen3:4b",
      instructions: "Extract the essential facts and constraints from a brief.",
    }),

    Agent("writer", {
      model: "ollama/qwen3:4b",
      instructions: "Turn research notes into a clear first draft.",
    }),

    Agent("editor", {
      model: "ollama/qwen3:4b",
      instructions: "Polish a draft while preserving its meaning.",
    }),

    Step("researchBrief", function () {
      return this.researcher.generate({ prompt: this.input.brief });
    }),

    Step("writeDraft", function () {
      return this.writer.generate({
        prompt: `Brief: ${this.input.brief}\nResearch:\n${this.researchBrief}`,
      });
    }),

    Step("editDraft", function () {
      return this.editor.generate({ prompt: this.writeDraft });
    }),
  )

  .meta({
    description: "Pass work through a fixed research, writing, and editing graph",
    input: {
      brief: {
        description: "Brief to process through the graph",
        example: "Explain why durable workflows matter",
      },
    },
  });
