import { afterEach, expect, mock, test } from "bun:test";

import { LoadExtractor } from ".";
import type { Load } from "../shared/load";
import { sampleLoad } from "../shared/test-helpers";

const originalKey = process.env.OPENAI_API_KEY;
afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

test("uses the Agent and parses its structured output", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  const generate = mock(
    async (_options: { prompt: string; abortSignal?: AbortSignal }) =>
      sampleLoad(),
  );
  await expect(
    LoadExtractor.extractLoad
      .ctx({ agent: { generate } })
      .run({ markdown: "Load tender" })
  ).resolves.toEqual(sampleLoad());
  expect(generate).toHaveBeenCalledTimes(1);
  expect(generate.mock.calls[0]?.[0]).toMatchObject({
    prompt: "Load tender",
    abortSignal: expect.any(AbortSignal),
  });
});

test("fails closed when the Agent returns an invalid load", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  await expect(
    LoadExtractor.extractLoad
      .ctx({
        agent: {
          generate: mock(
            async (): Promise<Load> =>
              ({ reference: "guessed" }) as unknown as Load,
          ),
        },
      })
      .run({ markdown: "Load tender" })
  ).rejects.toThrow("Invalid load structure");
});

test("requires credentials and validates source text before invoking the Agent", async () => {
  delete process.env.OPENAI_API_KEY;
  await expect(LoadExtractor.extractLoad({ markdown: "Load" })).rejects.toThrow(
    "OPENAI_API_KEY"
  );
  process.env.OPENAI_API_KEY = "test-key";
  const generate = mock(async () => sampleLoad());
  await expect(
    LoadExtractor.extractLoad
      .ctx({ agent: { generate } })
      .run({ markdown: " " })
  ).rejects.toThrow(
    "1–120,000"
  );
  expect(generate).not.toHaveBeenCalled();
});
