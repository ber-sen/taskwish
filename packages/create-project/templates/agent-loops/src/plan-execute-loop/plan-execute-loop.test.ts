import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { PlanExecuteLoop } from ".";

test("creates a plan and executes every step", async () => {
  const planner = mockAgent("1. Inspect\n2. Publish");
  const executor = mockAgent("inspection complete", "publication complete");

  await expect(
    PlanExecuteLoop.runPlanExecuteLoop
      .ctx({ planner, executor })
      .run({ goal: "Publish an article" }),
  ).resolves.toEqual(["inspection complete", "publication complete"]);
  expect(executor.generate).toHaveBeenCalledTimes(2);
});
