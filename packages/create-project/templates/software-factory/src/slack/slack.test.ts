import { expect, test } from "bun:test";
import { TW } from "taskwish";

import { Slack } from ".";

test("exports the local Slack actor", () => {
  expect(Slack[TW.Name]).toBe("Slack");
  expect(Slack.postMessage[TW.Name]).toBe("Slack::postMessage");
});

test("posts a message through the Slack Web API", async () => {
  const previousToken = process.env.TW_SLACK_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.TW_SLACK_API_KEY = "test-token";

  let request: { url: string; authorization: string | null; body: unknown };
  globalThis.fetch = (async (input, init) => {
    request = {
      url: String(input),
      authorization: new Headers(init?.headers).get("authorization"),
      body: JSON.parse(String(init?.body)),
    };
    return Response.json({ ok: true, channel: "C123", ts: "123.456" });
  }) as typeof fetch;

  try {
    const result = await Slack.postMessage.ctx({}).run({
      channel: "C123",
      text: "Review complete",
    });

    expect(result).toEqual({ ok: true, channel: "C123", ts: "123.456" });
    expect(request!).toEqual({
      url: "https://slack.com/api/chat.postMessage",
      authorization: "Bearer test-token",
      body: { channel: "C123", text: "Review complete" },
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) {
      delete process.env.TW_SLACK_API_KEY;
    } else {
      process.env.TW_SLACK_API_KEY = previousToken;
    }
  }
});
