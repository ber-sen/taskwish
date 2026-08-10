import { describe, expect, test } from "bun:test";
import { Trace } from "@taskwish/wire";

describe("TW", () => {
  test("Trace serializes to its data payload", () => {
    const trace = new Trace("Worker::run", {
      input: { value: 42 },
    });

    expect(trace.toJSON()).toEqual({
      ">>": "Worker::run",
      input: { value: 42 },
    });
    expect(JSON.parse(JSON.stringify(trace))).toEqual({
      ">>": "Worker::run",
      input: { value: 42 },
    });
  });
});
