import { Agent, Step } from "taskwish";

import { actor } from "./reflection-loop";

export const { runReflectionLoop } = actor()
  .on("Command", "runReflectionLoop")

  .input({ prompt: "string" })

  .run(
    Agent("generator", {
      model: "ollama/qwen3:4b",
      instructions: "Produce a useful first draft.",
    }),

    Agent("critic", {
      model: "ollama/qwen3:4b",
      instructions: "Identify specific weaknesses and omissions in a draft.",
    }),

    Agent("improver", {
      model: "ollama/qwen3:4b",
      instructions:
        "Rewrite a draft using the critique. Return only the improved result.",
    }),

    Step("generateDraft", function () {
      return this.generator.generate({ prompt: this.input.prompt });
    }),

    Step("critiqueDraft", function () {
      return this.critic.generate({
        prompt: `Request: ${this.input.prompt}\nDraft:\n${this.generateDraft}\nCritique the draft.`,
      });
    }),

    Step("improveDraft", function () {
      return this.improver.generate({
        prompt: `Request: ${this.input.prompt}\nDraft:\n${this.generateDraft}\nCritique:\n${this.critiqueDraft}`,
      });
    })
  )

  .meta({
    description: "Generate a draft, critique it, and improve it",
    input: {
      prompt: {
        description: "Content request to refine",
        example: "Explain agent loops to a beginner",
      },
    },
  });
