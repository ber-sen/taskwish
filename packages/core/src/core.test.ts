import { describe, expect, test } from "bun:test";
import { TW } from "./core";

describe("TW", () => {
  test("Trace serializes to its data payload", () => {
    const trace = new TW.Trace("Worker::run", {
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
