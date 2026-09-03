import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { MapReduceGraph } from ".";

test("maps dynamically planned work and reduces the results", async () => {
  const planner = mockAgent("- Cost\n- Risk\n- Timeline");
  const worker = mockAgent("cost findings", "risk findings", "timeline findings");
  const reducer = mockAgent("combined report");

  await expect(
    MapReduceGraph.runMapReduceGraph
      .ctx({ planner, worker, reducer })
      .run({ topic: "Database migration" }),
  ).resolves.toBe("combined report");
  expect(worker.generate).toHaveBeenCalledTimes(3);
});
