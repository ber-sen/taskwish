import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { ToolCallingLoop } from ".";

test("runs Model → Tool → Result → Model with a mocked agent", async () => {
  const agent = mockAgent("17 × 24 is 408.");

  await expect(
    ToolCallingLoop.runToolCallingLoop
      .ctx({ agent })
      .run({ problem: "What is 17 multiplied by 24?" })
  ).resolves.toBe("17 × 24 is 408.");
  expect(agent.generate).toHaveBeenCalledTimes(1);
});
