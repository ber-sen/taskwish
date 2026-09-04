import { Agent, Step } from "taskwish";

import { actor } from "./retry-error-correction-loop";

export const { runRetryErrorCorrectionLoop } = actor()
  .on("Command", "runRetryErrorCorrectionLoop")

  .input({ task: "string", "maxRetries?": "number" })

  .run(
    Agent("worker", {
      model: "ollama/qwen3:4b",
      instructions: "Return a concrete action for the requested task.",
    }),

    Agent("fixer", {
      model: "ollama/qwen3:4b",
      instructions: "Correct an action after an execution error.",
    }),

    Step("createAction", function () {
      return this.worker.generate({ prompt: this.input.task });
    }),

    Step("actFixRetry", async function () {
      let candidate = this.createAction;
      const attempts: Array<{ candidate: string; error?: string }> = [];
      const maxRetries = Math.max(1, Math.min(this.input.maxRetries ?? 2, 5));

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt === 0)
            throw new Error("Simulated transient execution failure");
          return { result: `Executed: ${candidate}`, attempts };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          attempts.push({ candidate, error: message });
          if (attempt === maxRetries) throw error;
          candidate = await this.fixer.generate({
            prompt: `Task: ${this.input.task}\nFailed action: ${candidate}\nError: ${message}\nReturn a corrected action.`,
          });
        }
      }

      throw new Error("Retry loop ended unexpectedly.");
    })
  )

  .meta({
    description: "Act, inspect an error, correct the action, and retry",
    input: {
      task: {
        description: "Task whose action should be retried",
        example: "Submit a report to an unreliable service",
      },
      maxRetries: {
        description: "Maximum corrections after failure",
        example: 2,
      },
    },
  });
