import { Agent, Step } from "taskwish";

import { ollamaModel } from "../shared/ollama";

import { actor } from "./self-ask-loop";

export const { runSelfAskLoop } = actor()
  .on("Command", "runSelfAskLoop")

  .input({ question: "string", "maxSubQuestions?": "number" })

  .run(
    Agent("questioner", {
      model: ollamaModel,
      instructions: "Ask the most useful next sub-question. Return only the question.",
    }),

    Agent("researcher", {
      model: ollamaModel,
      instructions: "Answer one focused sub-question using the supplied context.",
    }),

    Step("askAndResearch", async function () {
      const findings: Array<{ question: string; answer: string }> = [];
      const count = Math.max(1, Math.min(this.input.maxSubQuestions ?? 3, 8));

      for (let index = 0; index < count; index++) {
        const question = await this.questioner.generate({
          prompt: `Main question: ${this.input.question}\nFindings: ${JSON.stringify(findings)}\nAsk the next unresolved sub-question.`,
        });
        const answer = await this.researcher.generate({
          prompt: `Main question: ${this.input.question}\nSub-question: ${question}\nKnown findings: ${JSON.stringify(findings)}`,
        });
        findings.push({ question, answer });
      }

      return findings;
    }),

    Step("synthesizeAnswer", function () {
      return this.researcher.generate({
        prompt: `Main question: ${this.input.question}\nResearch: ${JSON.stringify(this.askAndResearch)}\nSynthesize the final answer.`,
      });
    }),
  )

  .meta({
    description: "Ask and research successive sub-questions before answering",
    input: {
      question: { description: "Complex question to decompose", example: "Why did conversion fall this month?" },
      maxSubQuestions: { description: "Maximum sub-questions", example: 3 },
    },
  });
