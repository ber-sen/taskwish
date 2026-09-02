import { Agent, Step, Tool } from "taskwish";

import { actor } from "./tool-calling-loop";

export const { runToolCallingLoop } = actor()
  .on("Command", "runToolCallingLoop")

  .input({ problem: "string" })

  .run(
    Tool("calculate", {
      description: "Perform arithmetic on two numbers",
      input: { operation: "string", left: "number", right: "number" },
      run() {
        if (this.input.operation === "add")
          return this.input.left + this.input.right;
        if (this.input.operation === "subtract")
          return this.input.left - this.input.right;
        if (this.input.operation === "multiply")
          return this.input.left * this.input.right;
        if (this.input.operation === "divide") {
          if (this.input.right === 0) throw new Error("Cannot divide by zero.");
          return this.input.left / this.input.right;
        }
        throw new Error(`Unknown operation: ${this.input.operation}`);
      },
    }),

    Agent({
      model: "ollama/qwen3:4b",
      instructions:
        "Solve arithmetic problems with the calculate tool and explain the result.",
      tools: ["calculate"],
    }),

    Step("modelToolResultModel", function () {
      return this.agent.generate({ prompt: this.input.problem });
    })
  )

  .meta({
    description: "Run a Model → Tool → Result → Model loop",
    input: {
      problem: {
        description: "Arithmetic problem to solve",
        example: "What is 17 multiplied by 24?",
      },
    },
  });
