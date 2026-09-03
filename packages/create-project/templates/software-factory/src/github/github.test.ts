import { expect, test } from "bun:test";
import { TW } from "taskwish";

import { GitHub } from ".";

test("exposes a GitHub webhook integration", () => {
  expect(GitHub[TW.Name]).toBe("GitHub");
  expect(GitHub.receiveIssueWebhook[TW.Meta].route.slice(0, 2)).toEqual([
    "POST",
    "/integrations/github/issues",
  ]);
});

test("turns an opened issue into the first factory event", async () => {
  await expect(
    GitHub.receiveIssueWebhook({
      action: "opened",
      issue: {
        number: 42,
        title: "Add actor orchestration",
        body: "Connect agents with events.",
        html_url: "https://github.com/taskwish/taskwish/issues/42",
      },
      repository: { name: "taskwish", owner: { login: "taskwish" } },
    }),
  ).resolves.toMatchObject({
    event: "GitHub::IssueOpened",
    data: { number: 42, repository: "taskwish" },
  });
});
