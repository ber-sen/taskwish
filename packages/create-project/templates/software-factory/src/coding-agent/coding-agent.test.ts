import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { onGitHubIssueOpened } from "./on-github-issue-opened";

test("publishes a change proposal for review", async () => {
  const coder = mockAgent("Update the handler and add a regression test.");

  const result = await onGitHubIssueOpened.ctx({ coder }).run({
    owner: "taskwish",
    repository: "taskwish",
    number: 42,
    title: "Requests time out",
    body: "The API times out after deployment.",
    url: "https://github.com/taskwish/taskwish/issues/42",
  });

  expect(result).toMatchObject({
    event: "CodingAgent::ChangeProposed",
    data: {
      number: 42,
      proposal: "Update the handler and add a regression test.",
    },
  });
});
