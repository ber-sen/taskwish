import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { EvaluatorOptimizerLoop } from ".";

test("evaluates and optimizes until the candidate passes", async () => {
  const generator = mockAgent("draft");
  const evaluator = mockAgent("IMPROVE: add evidence", "PASS: complete");
  const optimizer = mockAgent("draft with evidence");

  await expect(
    EvaluatorOptimizerLoop.runEvaluatorOptimizerLoop
      .ctx({ generator, evaluator, optimizer })
      .run({ task: "Write an announcement", maxIterations: 2 })
  ).resolves.toEqual({
    candidate: "draft with evidence",
    history: [
      { candidate: "draft", evaluation: "IMPROVE: add evidence" },
      { candidate: "draft with evidence", evaluation: "PASS: complete" },
    ],
  });
});
