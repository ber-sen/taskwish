import { Agent, Step } from "taskwish";

import { actor } from "./fallback-graph";

export const { runFallbackGraph } = actor()
  .on("Command", "runFallbackGraph")

  .input({ request: "string" })

  .run(
    Agent("primary", {
      model: "ollama/qwen3:4b",
      instructions: "Answer requests directly and accurately.",
    }),

    Agent("validator", {
      model: "ollama/qwen3:4b",
      instructions: "Return PASS for an acceptable answer or FAIL with a reason.",
    }),

    Agent("fallback", {
      model: "ollama/qwen3:4b",
      instructions: "Produce a conservative answer using the request, draft, and validation.",
    }),

    Step("runPrimaryPath", function () {
      return this.primary.generate({ prompt: this.input.request });
    }),

    Step("validatePrimaryPath", function () {
      return this.validator.generate({
        prompt: `Request: ${this.input.request}\nDraft: ${this.runPrimaryPath}`,
      });
    }),

    Step("chooseTerminalPath", async function () {
      if (/^pass\b/i.test(this.validatePrimaryPath.trim())) {
        return { path: "primary" as const, response: this.runPrimaryPath };
      }

      const response = await this.fallback.generate({
        prompt: `Request: ${this.input.request}\nDraft: ${this.runPrimaryPath}\nValidation: ${this.validatePrimaryPath}`,
      });
      return { path: "fallback" as const, response };
    }),
  )

  .meta({
    description: "Take a fast primary path or branch to a guarded fallback",
    input: {
      request: {
        description: "Request to resolve through a validated path",
        example: "Summarize the release risks",
      },
    },
  });
