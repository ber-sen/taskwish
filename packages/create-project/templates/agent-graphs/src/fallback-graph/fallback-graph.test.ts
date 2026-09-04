import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { FallbackGraph } from ".";

test("skips the fallback when validation passes", async () => {
  const primary = mockAgent("safe answer");
  const validator = mockAgent("PASS");
  const fallback = mockAgent("unused");

  await expect(
    FallbackGraph.runFallbackGraph
      .ctx({ primary, validator, fallback })
      .run({ request: "Summarize risk" }),
  ).resolves.toEqual({ path: "primary", response: "safe answer" });
  expect(fallback.generate).not.toHaveBeenCalled();
});

test("traverses the fallback branch when validation fails", async () => {
  const primary = mockAgent("unsafe answer");
  const validator = mockAgent("FAIL: missing evidence");
  const fallback = mockAgent("careful answer");

  await expect(
    FallbackGraph.runFallbackGraph
      .ctx({ primary, validator, fallback })
      .run({ request: "Summarize risk" }),
  ).resolves.toEqual({ path: "fallback", response: "careful answer" });
});
