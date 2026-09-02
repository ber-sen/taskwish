import { Agent, Step } from "taskwish";

import { actor } from "./supervisor-worker-loop";

export const { runSupervisorWorkerLoop } = actor()
  .on("Command", "runSupervisorWorkerLoop")

  .input({ task: "string" })

  .run(
    Agent("supervisor", {
      model: "ollama/qwen3:4b",
      instructions: "Delegate precise work and evaluate the worker's result.",
    }),

    Agent("worker", {
      model: "ollama/qwen3:4b",
      instructions: "Execute delegated work and return a complete result.",
    }),

    Step("delegateTask", function () {
      return this.supervisor.generate({
        prompt: `Task: ${this.input.task}\nWrite a precise delegation for a worker.`,
      });
    }),

    Step("executeDelegation", function () {
      return this.worker.generate({ prompt: this.delegateTask });
    }),

    Step("evaluateResult", function () {
      return this.supervisor.generate({
        prompt: `Original task: ${this.input.task}\nDelegation: ${this.delegateTask}\nWorker result:\n${this.executeDelegation}\nEvaluate the result and give the final decision.`,
      });
    })
  )

  .meta({
    description:
      "Have a supervisor delegate, a worker execute, and the supervisor evaluate",
    input: {
      task: {
        description: "Task the supervisor should delegate",
        example: "Draft a customer interview guide",
      },
    },
  });
