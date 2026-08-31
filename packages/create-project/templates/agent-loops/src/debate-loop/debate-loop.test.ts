import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { DebateLoop } from ".";

test("lets agents debate before a judge decides", async () => {
  const proposer = mockAgent("use a queue", "queues isolate failures");
  const challenger = mockAgent("avoid a queue", "queues add latency");
  const judge = mockAgent("Use a queue for failure isolation.");

  await expect(
    DebateLoop.runDebateLoop
      .ctx({ proposer, challenger, judge })
      .run({ question: "Should this service use a queue?" }),
  ).resolves.toBe("Use a queue for failure isolation.");
  expect(judge.generate).toHaveBeenCalledTimes(1);
});
