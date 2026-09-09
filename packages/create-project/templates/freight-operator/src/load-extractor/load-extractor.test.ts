import { afterEach, expect, mock, test } from "bun:test";

import { LoadExtractor } from ".";
import { sampleLoad } from "../shared/test-helpers";

const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

test("uses strict structured output and parses the completed response", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  const fetchMock = mock(
    async (_url: string | URL | Request, options?: RequestInit) => {
      const body = JSON.parse(options!.body as string);
      expect(body.text.format).toMatchObject({
        type: "json_schema",
        strict: true,
      });
      expect(body.store).toBe(false);
      expect(body.instructions).toContain("Never approve");
      return Response.json({
        status: "completed",
        output: [
          { type: "reasoning" },
          {
            type: "message",
            content: [
              { type: "output_text", text: JSON.stringify(sampleLoad()) },
            ],
          },
        ],
      });
    }
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  expect(await LoadExtractor.extractLoad({ markdown: "Load tender" })).toEqual(
    sampleLoad()
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test.each([
  { status: "incomplete", output: [] },
  {
    status: "completed",
    output: [{ type: "message", content: [{ type: "refusal" }] }],
  },
  {
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: '{"reference": "guessed"}' }],
      },
    ],
  },
])(
  "fails closed on incomplete, refused, or invalid output: %j",
  async (response) => {
    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = mock(async () =>
      Response.json(response)
    ) as unknown as typeof fetch;
    await expect(
      LoadExtractor.extractLoad({ markdown: "Load tender" })
    ).rejects.toThrow();
  }
);

test("requires credentials and checks API failures", async () => {
  delete process.env.OPENAI_API_KEY;
  await expect(LoadExtractor.extractLoad({ markdown: "Load" })).rejects.toThrow(
    "OPENAI_API_KEY"
  );
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = mock(
    async () => new Response("private detail", { status: 429 })
  ) as unknown as typeof fetch;
  await expect(LoadExtractor.extractLoad({ markdown: "Load" })).rejects.toThrow(
    "HTTP 429"
  );
});
