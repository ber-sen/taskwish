import { Agent, Step, Tool } from "taskwish";

import { ollamaModel } from "../shared/ollama";

import { actor } from "./react-loop";

const facts = [
  "TaskWish actions are composed from named steps.",
  "TaskWish actors expose actions through services.",
  "ReAct alternates reasoning, action, and observation.",
];

export const { runReactLoop } = actor()
  .on("Command", "runReactLoop")

  .input({ question: "string" })

  .run(
    Tool("lookupFact", {
      description: "Look up facts in the example knowledge base",
      input: { query: "string" },
      run() {
        const words = this.input.query.toLowerCase().split(/\W+/).filter(Boolean);
        return facts.filter((fact) =>
          words.some((word) => fact.toLowerCase().includes(word)),
        );
      },
    }),

    Agent({
      model: ollamaModel,
      instructions: "Use lookupFact as needed. Reason, act, observe the result, and repeat until you can answer.",
      tools: ["lookupFact"],
    }),

    Step("reasonActObserve", function () {
      return this.agent.generate({ prompt: this.input.question });
    }),
  )

  .meta({
    description: "Run a ReAct loop with a small local knowledge tool",
    input: {
      question: { description: "Question the agent should investigate", example: "How are TaskWish actions organized?" },
    },
  });
