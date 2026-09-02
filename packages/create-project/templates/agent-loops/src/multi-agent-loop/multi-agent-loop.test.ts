import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { MultiAgentLoop } from ".";

test("alternates between two mocked agents", async () => {
  const agentA = mockAgent("proposal", "revised proposal");
  const agentB = mockAgent("review");

  await expect(
    MultiAgentLoop.runMultiAgentLoop
      .ctx({ agentA, agentB })
      .run({ topic: "Onboarding", rounds: 1 })
  ).resolves.toEqual([
    { agent: "A", message: "proposal" },
    { agent: "B", message: "review" },
    { agent: "A", message: "revised proposal" },
  ]);
});
