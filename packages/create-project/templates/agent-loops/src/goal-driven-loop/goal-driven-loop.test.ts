import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { GoalDrivenLoop } from ".";

test("chooses actions until the goal condition is satisfied", async () => {
  const agent = mockAgent("inspect", "ship");

  await expect(
    GoalDrivenLoop.runGoalDrivenLoop
      .ctx({ agent })
      .run({ goal: "Release", requiredActions: 2 }),
  ).resolves.toEqual({
    goal: "Release",
    satisfied: true,
    actions: ["inspect", "ship"],
  });
});
