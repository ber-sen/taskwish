import { actor } from "./github";

export const { receiveIssueWebhook } = actor()
  .on("POST", "/integrations/github/issues", {
    body: {
      action: "string",
      issue: {
        number: "number",
        title: "string",
        body: "string | null",
        html_url: "string",
      },
      repository: {
        name: "string",
        owner: {
          login: "string",
        },
      },
    },
  })
  .command("receiveIssueWebhook")

  .run(function () {
    if (this.input.action !== "opened") {
      throw new Error(`Expected an opened issue, received ${this.input.action}.`);
    }
    return this.signal("GitHub::IssueOpened", {
      owner: this.input.repository.owner.login,
      repository: this.input.repository.name,
      number: this.input.issue.number,
      title: this.input.issue.title,
      body: this.input.issue.body ?? "",
      url: this.input.issue.html_url,
    });
  })

  .meta({
    description: "Receive a GitHub issues webhook and emit GitHub::IssueOpened",
    input: {
      action: { description: "GitHub issue action", example: "opened" },
      issue: { description: "Issue payload sent by GitHub" },
      repository: { description: "Repository payload sent by GitHub" },
    },
  });
