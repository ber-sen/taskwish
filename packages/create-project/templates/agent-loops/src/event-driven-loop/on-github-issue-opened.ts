import { Agent, Step } from "taskwish";

import { actor } from "./event-driven-loop";

export const { onGitHubIssueOpened } = actor()
  .on("GitHub::IssueOpened")

  .run(
    Agent({
      model: "ollama/qwen3:4b",
      instructions:
        "Decide and return one concrete response action for a newly opened GitHub issue.",
    }),

    Step("decideAction", function () {
      return this.agent.generate({
        prompt: [
          `Repository: ${this.input.owner}/${this.input.repository}`,
          `Issue: #${this.input.number} ${this.input.title}`,
          `URL: ${this.input.url}`,
          `Body: ${this.input.body}`,
          "Decide the next action.",
        ].join("\n"),
      });
    })
  )

  .meta({
    description: "Decide what to do when GitHub emits an IssueOpened event",
  });
