import { describe, expect, test } from "bun:test";

import { streamActionResponse } from "./command-form";

async function finalStreamResult(body: string) {
  const response = new Response(body, {
    headers: { "Content-Type": "text/event-stream" },
  });
  let result;

  for await (const update of streamActionResponse(response)) result = update;

  return result;
}

describe("command response streams", () => {
  test("normalizes protocol trace data to the console log shape", async () => {
    const result = await finalStreamResult(
      'event: TW::Trace\ndata: {"path":"Greeter::hello","input":{"name":"Ada"}}\n\n'
    );

    expect(result?.events).toEqual([
      {
        type: "wire",
        data: { ">>": "Greeter::hello", input: { name: "Ada" } },
      },
    ]);
  });

  test("normalizes protocol signal data to the console log shape", async () => {
    const result = await finalStreamResult(
      'event: TW::Signal\ndata: {"event":"Greeter::Message","data":{"name":"Ada"}}\n\n'
    );

    expect(result?.events).toEqual([
      {
        type: "wire",
        data: { "->": "Greeter::Message", data: { name: "Ada" } },
      },
    ]);
  });
});
