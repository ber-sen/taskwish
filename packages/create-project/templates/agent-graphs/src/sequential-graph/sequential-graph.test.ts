import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { SequentialGraph } from ".";

test("passes each node output to the next node", async () => {
  const researcher = mockAgent("facts");
  const writer = mockAgent("draft");
  const editor = mockAgent("final copy");

  await expect(
    SequentialGraph.runSequentialGraph
      .ctx({ researcher, writer, editor })
      .run({ brief: "Write a launch note" }),
  ).resolves.toBe("final copy");
  expect(researcher.generate).toHaveBeenCalledTimes(1);
  expect(writer.generate).toHaveBeenCalledTimes(1);
  expect(editor.generate).toHaveBeenCalledTimes(1);
});
