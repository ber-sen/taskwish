import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { HumanInTheLoop } from ".";

test("continues only after human approval", async () => {
  const agent = mockAgent("announcement sent");

  await expect(
    HumanInTheLoop.runHumanInTheLoop
      .ctx({ agent })
      .run({
        goal: "Send an announcement",
        proposal: "Email beta users",
        decision: "approve",
      }),
  ).resolves.toBe("announcement sent");
  expect(agent.generate).toHaveBeenCalledTimes(1);
});
