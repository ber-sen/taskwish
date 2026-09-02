import { Agent, Step } from "taskwish";

import { actor } from "./debate-loop";

export const { runDebateLoop } = actor()
  .on("Command", "runDebateLoop")

  .input({ question: "string" })

  .run(
    Agent("proposer", {
      model: "ollama/qwen3:4b",
      instructions: "Argue for the strongest answer to the question.",
    }),

    Agent("challenger", {
      model: "ollama/qwen3:4b",
      instructions: "Find flaws and propose a competing answer.",
    }),

    Agent("judge", {
      model: "ollama/qwen3:4b",
      instructions:
        "Impartially judge competing arguments and return the best-supported answer.",
    }),

    Step("proposeAnswers", async function () {
      const [proposal, challenge] = await Promise.all([
        this.proposer.generate({ prompt: this.input.question }),
        this.challenger.generate({
          prompt: `Develop a skeptical answer to: ${this.input.question}`,
        }),
      ]);
      return { proposal, challenge };
    }),

    Step("challengeAnswers", async function () {
      const [proposalResponse, challengeResponse] = await Promise.all([
        this.proposer.generate({
          prompt: `Question: ${this.input.question}\nOpponent: ${this.proposeAnswers.challenge}\nDefend or revise your answer.`,
        }),
        this.challenger.generate({
          prompt: `Question: ${this.input.question}\nOpponent: ${this.proposeAnswers.proposal}\nChallenge this answer.`,
        }),
      ]);
      return { proposalResponse, challengeResponse };
    }),

    Step("judgeDebate", function () {
      return this.judge.generate({
        prompt: `Question: ${
          this.input.question
        }\nOpening arguments: ${JSON.stringify(
          this.proposeAnswers
        )}\nResponses: ${JSON.stringify(
          this.challengeAnswers
        )}\nDecide the answer.`,
      });
    })
  )

  .meta({
    description:
      "Have agents propose and challenge answers before a judge decides",
    input: {
      question: {
        description: "Question to debate",
        example: "Should this service use a queue?",
      },
    },
  });
