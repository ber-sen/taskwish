import { expect, mock, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { onCodingAgentChangeProposed } from "./on-change-proposed";

test("reviews a proposal, notifies Slack, and publishes the result", async () => {
  const reviewer = mockAgent("Approved with a timeout regression test.");
  const postMessage = mock(async () => ({} as never));

  const result = await onCodingAgentChangeProposed
    .ctx({ actions: { slack: { postMessage } }, reviewer })
    .run({
      owner: "taskwish",
      repository: "taskwish",
      number: 42,
      title: "Requests time out",
      url: "https://github.com/taskwish/taskwish/issues/42",
      proposal: "Update the handler and add a regression test.",
    });

  expect(postMessage).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({
    event: "ReviewAgent::ChangeReviewed",
    data: { number: 42, review: "Approved with a timeout regression test." },
  });
});
