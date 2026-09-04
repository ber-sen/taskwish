import { Agent, Step } from "taskwish";

import { actor } from "./review-agent";

export const { onCodingAgentChangeProposed } = actor()
  .on("CodingAgent::ChangeProposed")

  .run(
    Agent("reviewer", {
      model: "ollama/qwen3:4b",
      instructions:
        "Review an implementation proposal for correctness, test coverage, and operational risk.",
    }),

    Step("reviewProposal", function () {
      return this.reviewer.generate({
        prompt: `Issue #${this.input.number}: ${this.input.title}\nProposal:\n${this.input.proposal}`,
      });
    }),

    Step("notifySlack", function () {
      return this.actions.slack.postMessage({
        channel: process.env.SLACK_CHANNEL_ID ?? "#software-factory",
        text: [
          `Review for ${this.input.owner}/${this.input.repository}#${this.input.number}`,
          this.input.url,
          this.reviewProposal,
        ].join("\n"),
      });
    }),

    Step("publishReview", function () {
      return this.signal("ReviewAgent::ChangeReviewed", {
        owner: this.input.owner,
        repository: this.input.repository,
        number: this.input.number,
        url: this.input.url,
        review: this.reviewProposal,
      });
    }),
  )

  .meta({
    description: "Review a proposed change and post the result to Slack",
  });
