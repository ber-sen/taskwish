import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { BasicAgentLoop } from ".";

test("runs Observe → Think → Act with a mocked agent", async () => {
  const agent = mockAgent("reasoning", "send the launch checklist");

  await expect(
    BasicAgentLoop.runBasicAgentLoop
      .ctx({ agent })
      .run({ goal: "Prepare launch", context: "Seven days remain" })
  ).resolves.toBe("send the launch checklist");
  expect(agent.generate).toHaveBeenCalledTimes(2);
});
