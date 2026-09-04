import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { RetryErrorCorrectionLoop } from ".";

test("fixes an action after an error and retries it", async () => {
  const worker = mockAgent("initial action");
  const fixer = mockAgent("corrected action");

  await expect(
    RetryErrorCorrectionLoop.runRetryErrorCorrectionLoop
      .ctx({ worker, fixer })
      .run({ task: "Submit report", maxRetries: 1 })
  ).resolves.toEqual({
    result: "Executed: corrected action",
    attempts: [
      {
        candidate: "initial action",
        error: "Simulated transient execution failure",
      },
    ],
  });
});
