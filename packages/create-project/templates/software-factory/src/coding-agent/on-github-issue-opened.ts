import { Agent, Step } from "taskwish";

import { actor } from "./coding-agent";

export const { onGitHubIssueOpened } = actor()
  .on("GitHub::IssueOpened")

  .run(
    Agent("coder", {
      model: "ollama/qwen3:4b",
      instructions:
        "Turn a GitHub issue into a concise implementation proposal with tests and risks.",
    }),

    Step("proposeChange", function () {
      return this.coder.generate({
        prompt: `Repository: ${this.input.owner}/${this.input.repository}\nIssue #${this.input.number}: ${this.input.title}\n${this.input.body}`,
      });
    }),

    Step("publishProposal", function () {
      return this.signal("CodingAgent::ChangeProposed", {
        owner: this.input.owner,
        repository: this.input.repository,
        number: this.input.number,
        title: this.input.title,
        url: this.input.url,
        proposal: this.proposeChange,
      });
    }),
  )

  .meta({ description: "Propose an implementation for a newly opened issue" });
