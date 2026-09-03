import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { ParallelGraph } from ".";

test("fans out reviews and joins them in a synthesis node", async () => {
  const riskReviewer = mockAgent("risk notes");
  const userReviewer = mockAgent("user notes");
  const technicalReviewer = mockAgent("technical notes");
  const synthesizer = mockAgent("ship with safeguards");

  await expect(
    ParallelGraph.runParallelGraph
      .ctx({ riskReviewer, userReviewer, technicalReviewer, synthesizer })
      .run({ proposal: "Migrate the API" }),
  ).resolves.toBe("ship with safeguards");
  expect(synthesizer.generate).toHaveBeenCalledTimes(1);
});
