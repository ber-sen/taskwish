import { Agent, Step } from "taskwish";

import { ollamaModel } from "../shared/ollama";

import { actor } from "./human-in-the-loop";

export const { runHumanInTheLoop } = actor()
  .on("Command", "runHumanInTheLoop")

  .input({
    goal: "string",
    "proposal?": "string",
    "decision?": "string",
    "feedback?": "string",
  })

  .run(
    Agent({
      model: ollamaModel,
      instructions: "Propose safe actions and execute only after explicit human approval.",
    }),

    Step("proposeAction", function () {
      if (this.input.proposal) return this.input.proposal;
      return this.agent.generate({
        prompt: `Goal: ${this.input.goal}\nPropose the next action for human approval. Do not execute it.`,
      });
    }),

    Step("requestApproval", function () {
      const decision = this.input.decision?.trim().toLowerCase();
      if (decision !== "approve" && decision !== "reject") {
        return {
          status: "approvalRequired",
          proposal: this.proposeAction,
          next: "Run this command again with the proposal and decision set to approve or reject.",
        };
      }
      return { status: decision, proposal: this.proposeAction };
    }),

    Step("continueAfterHuman", function () {
      if (this.requestApproval.status !== "approve") {
        return {
          status: this.requestApproval.status,
          proposal: this.requestApproval.proposal,
          feedback: this.input.feedback,
        };
      }
      return this.agent.generate({
        prompt: `Goal: ${this.input.goal}\nApproved action: ${this.requestApproval.proposal}\nHuman feedback: ${this.input.feedback ?? "None"}\nContinue with the approved action and report the result.`,
      });
    }),
  )

  .meta({
    description: "Propose an action, pause for human approval, then continue",
    input: {
      goal: { description: "Goal requiring human oversight", example: "Send a customer-facing announcement" },
      proposal: { description: "Proposal returned by the previous call" },
      decision: { description: "Use approve or reject", example: "approve" },
      feedback: { description: "Optional human guidance", example: "Use a warmer tone" },
    },
  });
