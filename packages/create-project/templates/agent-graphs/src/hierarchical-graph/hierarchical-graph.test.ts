import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { HierarchicalGraph } from ".";

test("delegates down the hierarchy and aggregates upward", async () => {
  const manager = mockAgent("team assignments", "integrated plan");
  const productLead = mockAgent("product task");
  const engineeringLead = mockAgent("engineering task");
  const specialist = mockAgent("product result", "engineering result");

  await expect(
    HierarchicalGraph.runHierarchicalGraph
      .ctx({ manager, productLead, engineeringLead, specialist })
      .run({ objective: "Improve onboarding" }),
  ).resolves.toBe("integrated plan");
  expect(specialist.generate).toHaveBeenCalledTimes(2);
});
