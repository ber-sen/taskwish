import { Agent, Step } from "taskwish";

import { actor } from "./multi-agent-loop";

export const { runMultiAgentLoop } = actor()
  .on("Command", "runMultiAgentLoop")

  .input({ topic: "string", "rounds?": "number" })

  .run(
    Agent("agentA", {
      model: "ollama/qwen3:4b",
      instructions:
        "Develop a proposal and incorporate useful feedback from Agent B.",
    }),

    Agent("agentB", {
      model: "ollama/qwen3:4b",
      instructions: "Review Agent A's proposal and respond with improvements.",
    }),

    Step("alternateAgents", async function () {
      const transcript: Array<{ agent: "A" | "B"; message: string }> = [];
      let message = await this.agentA.generate({
        prompt: `Propose an approach for: ${this.input.topic}`,
      });
      transcript.push({ agent: "A", message });
      const rounds = Math.max(1, Math.min(this.input.rounds ?? 2, 6));

      for (let round = 0; round < rounds; round++) {
        message = await this.agentB.generate({
          prompt: `Topic: ${this.input.topic}\nAgent A said:\n${message}\nRespond to Agent A.`,
        });
        transcript.push({ agent: "B", message });
        message = await this.agentA.generate({
          prompt: `Topic: ${this.input.topic}\nAgent B replied:\n${message}\nContinue and improve the proposal.`,
        });
        transcript.push({ agent: "A", message });
      }

      return transcript;
    })
  )

  .meta({
    description: "Alternate messages between two agents for several rounds",
    input: {
      topic: {
        description: "Topic the agents should develop",
        example: "Design an onboarding flow",
      },
      rounds: { description: "Number of A/B exchanges", example: 2 },
    },
  });
