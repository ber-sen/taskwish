import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { PlanExecuteReplanLoop } from ".";

test("replans after executing the first step", async () => {
  const planner = mockAgent("1. Inspect\n2. Deploy");
  const executor = mockAgent("inspection complete", "staged", "deployed");
  const replanner = mockAgent("1. Stage\n2. Deploy");

  await expect(
    PlanExecuteReplanLoop.runPlanExecuteReplanLoop
      .ctx({ planner, executor, replanner })
      .run({ goal: "Migrate the service" })
  ).resolves.toEqual({
    first: { step: "Inspect", result: "inspection complete" },
    revisedPlan: "1. Stage\n2. Deploy",
    results: ["staged", "deployed"],
  });
});
