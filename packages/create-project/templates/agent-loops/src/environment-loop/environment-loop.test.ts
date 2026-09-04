import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { EnvironmentLoop } from ".";

test("observes the environment after every action", async () => {
  const agent = mockAgent("1", "1");

  await expect(
    EnvironmentLoop.runEnvironmentLoop
      .ctx({ agent })
      .run({ target: 2, maxIterations: 2 }),
  ).resolves.toEqual({
    position: 2,
    target: 2,
    reached: true,
    observations: [
      { before: 0, action: 1, after: 1 },
      { before: 1, action: 1, after: 2 },
    ],
  });
});
