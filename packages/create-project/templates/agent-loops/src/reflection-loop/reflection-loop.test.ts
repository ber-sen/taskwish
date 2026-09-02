import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { ReflectionLoop } from ".";

test("generates, critiques, and improves a draft", async () => {
  const generator = mockAgent("first draft");
  const critic = mockAgent("add a concrete example");
  const improver = mockAgent("improved draft with an example");

  await expect(
    ReflectionLoop.runReflectionLoop
      .ctx({ generator, critic, improver })
      .run({ prompt: "Explain agent loops" })
  ).resolves.toBe("improved draft with an example");
});
