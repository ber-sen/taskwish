import { describe, expect, test } from "bun:test";

import { Wire } from "./bus";

describe("Wire", () => {
  test("logs trace events with a stable thread id", () => {
    const events: unknown[] = [];
    const wire = new Wire({
      threadId: "thread-1",
      log: (event) => events.push(event),
    });

    const event = wire.trace("Greeter::hello", { input: { name: "Ada" } });

    expect(events).toEqual([event]);
    expect(event).toEqual({
      ">>": "Greeter::hello",
      threadId: "thread-1",
      input: { name: "Ada" },
    });
  });

  test("supports console logging shorthand", () => {
    const events: unknown[] = [];
    const originalLog = console.log;
    console.log = (event: unknown) => {
      events.push(event);
    };

    try {
      const wire = new Wire({ threadId: "main", log: "console" });
      const event = wire.trace("Greeter::hello", { input: { name: "Ada" } });
      const formattedEvent = stripAnsi(String(events[0]));

      expect(events).toHaveLength(1);
      expect(events[0]).toBeString();
      expect(formattedEvent).toContain(`">>": "Greeter::hello"`);
      expect(formattedEvent).toContain(`"threadId": "main"`);
      expect(formattedEvent).toContain(`"input": { "name": "Ada" }`);
      expect(event).toEqual({
        ">>": "Greeter::hello",
        threadId: "main",
        input: { name: "Ada" },
      });
    } finally {
      console.log = originalLog;
    }
  });
});

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}
