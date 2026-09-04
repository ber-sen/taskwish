import { Agent, Step } from "taskwish";

import { numericScore } from "../shared/text";
import { actor } from "./environment-loop";

export const { runEnvironmentLoop } = actor()
  .on("Command", "runEnvironmentLoop")

  .input({ target: "number", "maxIterations?": "number" })

  .run(
    Agent({
      model: "openai/gpt-5-mini",
      instructions: "Control a number-line environment. Reply with only -1, 0, or 1.",
    }),

    Step("observeActObserve", async function () {
      let position = 0;
      const observations: Array<{ before: number; action: number; after: number }> = [];
      const iterations = Math.max(1, Math.min(this.input.maxIterations ?? 8, 20));

      for (let iteration = 0; iteration < iterations && position !== this.input.target; iteration++) {
        const decision = await this.agent.generate({
          prompt: `Current position: ${position}. Target: ${this.input.target}. Choose -1, 0, or 1.`,
        });
        const parsed = Math.sign(numericScore(decision));
        const action = parsed === 0 ? Math.sign(this.input.target - position) : parsed;
        const before = position;
        position += action;
        observations.push({ before, action, after: position });
      }

      return { position, target: this.input.target, reached: position === this.input.target, observations };
    }),
  )

  .meta({
    description: "Observe and act on a simulated environment until a target is reached",
    input: {
      target: { description: "Target position in the number-line environment", example: 4 },
      maxIterations: { description: "Maximum environment interactions", example: 8 },
    },
  });
