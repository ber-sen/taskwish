import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { TreeSearchLoop } from ".";

test("evaluates branches and explores the best path", async () => {
  const explorer = mockAgent("- Cache reads\n- Batch writes\n- Add replicas");
  const evaluator = mockAgent("90", "70", "50");

  await expect(
    TreeSearchLoop.runTreeSearchLoop
      .ctx({ explorer, evaluator })
      .run({ goal: "Reduce latency", depth: 1 })
  ).resolves.toEqual({
    bestPath: ["Cache reads"],
    explored: [
      [
        { action: "Cache reads", score: 90 },
        { action: "Batch writes", score: 70 },
        { action: "Add replicas", score: 50 },
      ],
    ],
  });
});
