import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { ReActLoop } from ".";

test("runs Reason → Act → Observe with a mocked agent", async () => {
  const agent = mockAgent("TaskWish actors expose actions through services.");

  await expect(
    ReActLoop.runReactLoop
      .ctx({ agent })
      .run({ question: "How are actions exposed?" }),
  ).resolves.toBe("TaskWish actors expose actions through services.");
  expect(agent.generate).toHaveBeenCalledTimes(1);
});
