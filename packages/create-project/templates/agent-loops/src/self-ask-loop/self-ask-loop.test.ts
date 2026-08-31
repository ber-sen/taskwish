import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { SelfAskLoop } from ".";

test("asks a sub-question, researches it, and synthesizes an answer", async () => {
  const questioner = mockAgent("Did traffic quality change?");
  const researcher = mockAgent("Paid traffic declined.", "Conversion fell with paid traffic.");

  await expect(
    SelfAskLoop.runSelfAskLoop
      .ctx({ questioner, researcher })
      .run({ question: "Why did conversion fall?", maxSubQuestions: 1 }),
  ).resolves.toBe("Conversion fell with paid traffic.");
  expect(researcher.generate).toHaveBeenCalledTimes(2);
});
