import { expect, test } from "bun:test";
import { TW } from "taskwish";

import { mockAgent } from "../shared/test-helpers";
import { EventDrivenLoop } from ".";
import { onGitHubIssueOpened } from "./on-github-issue-opened";

test("handles the GitHub issue event with a mocked agent", async () => {
  const listeners = (
    EventDrivenLoop as unknown as Record<symbol, Array<Record<symbol, unknown>>>
  )[TW.Listeners];
  expect(listeners as unknown[]).toContain(onGitHubIssueOpened);

  const agent = mockAgent("triage and label the issue");
  await expect(
    onGitHubIssueOpened.ctx({ agent }).run({
      owner: "taskwish",
      repository: "taskwish",
      number: 42,
      title: "Add an event loop",
      body: "Please add the example.",
      url: "https://github.com/taskwish/taskwish/issues/42",
    }),
  ).resolves.toBe("triage and label the issue");
});
