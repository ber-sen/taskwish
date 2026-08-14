import { describe, expect, test } from "bun:test";

import { Wire, configureWire, getWireConfig, ulid } from "./bus";

describe("Wire", () => {
  test("generates a ULID thread id by default", () => {
    const wire = new Wire();
    const event = wire.trace("Greeter::hello", { input: { name: "Ada" } });

    expect(wire.threadId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(event.threadId).toBe(wire.threadId);
  });

  test("does not log without instance or global log config", () => {
    const events: unknown[] = [];
    const originalLog = console.log;
    console.log = (event: unknown) => {
      events.push(event);
    };

    try {
      configureWire({ log: undefined, threadId: undefined });
      const wire = new Wire();
      wire.trace("Greeter::hello", { input: { name: "Ada" } });

      expect(events).toEqual([]);
    } finally {
      console.log = originalLog;
    }
  });

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

  test("logs and emits signal events with a stable thread id", async () => {
    const loggedEvents: unknown[] = [];
    const emittedEvents: unknown[] = [];
    const { events } = await import("./bus");
    const wire = new Wire({
      threadId: "thread-1",
      log: (event) => loggedEvents.push(event),
    });
    const listener = (event: unknown) => emittedEvents.push(event);

    events.on("Greeter::Message", listener);

    try {
      const event = wire.signal("Greeter::Message", { name: "Ada" });

      expect(loggedEvents).toEqual([event]);
      expect(emittedEvents).toEqual([{ name: "Ada" }]);
      expect(event).toEqual({
        "->": "Greeter::Message",
        threadId: "thread-1",
        name: "Ada",
      });
    } finally {
      events.off("Greeter::Message", listener);
    }
  });

  test("accepts service references in global config", () => {
    const service = { hello: () => "hello" };

    configureWire({ services: [service] });

    expect(getWireConfig()).toEqual({
      threadId: undefined,
      log: undefined,
    });
  });

  test("supports global logging config", () => {
    const events: unknown[] = [];
    configureWire({
      threadId: "thread-global",
      log: (event) => events.push(event),
    });

    try {
      const wire = new Wire();
      const event = wire.trace("Greeter::hello", { input: { name: "Ada" } });

      expect(getWireConfig()).toEqual({
        threadId: "thread-global",
        log: expect.any(Function),
      });
      expect(events).toEqual([event]);
      expect(event).toEqual({
        ">>": "Greeter::hello",
        threadId: "thread-global",
        input: { name: "Ada" },
      });
    } finally {
      configureWire({ log: undefined, threadId: undefined });
    }
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

  test("generates canonical ULIDs", () => {
    expect(ulid(0)).toMatch(/^0000000000[0-9A-HJKMNP-TV-Z]{16}$/);
  });
});

function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}
