import { afterEach, expect, mock, test } from "bun:test";
import { Server } from "./index";
import { apiKey } from "./test-helpers";

const originalServe = Bun.serve;
const originalLog = console.log;

type ServeOptions = Parameters<typeof Bun.serve>[0];

function fakeServer(port: number): Bun.Server<any> {
  return {
    port,
    url: new URL(`http://127.0.0.1:${port}`),
    stop: mock(async () => {}),
  } as unknown as Bun.Server<any>;
}

function portUnavailable(): Error {
  const error = new Error("address already in use");
  Object.assign(error, { code: "EADDRINUSE" });
  return error;
}

afterEach(() => {
  Bun.serve = originalServe;
  console.log = originalLog;
});

test("falls back to a random port when the configured port is unavailable", async () => {
  const occupiedPort = 31337;
  const calls: ServeOptions[] = [];

  Bun.serve = mock((options: ServeOptions) => {
    calls.push(options);
    if (options.port === occupiedPort) throw portUnavailable();
    return fakeServer(Number(options.port));
  }) as typeof Bun.serve;
  console.log = mock(() => {}) as typeof console.log;

  const node = await Server("fallback", {
    port: occupiedPort,
    hostname: "127.0.0.1",
    apiKey,
  });

  try {
    expect(calls).toHaveLength(2);
    expect(calls[0].port).toBe(occupiedPort);
    expect(calls[1].port).not.toBe(occupiedPort);
    expect(Number(calls[1].port)).toBeGreaterThan(0);
    expect(node.port).toBe(Number(calls[1].port));
  } finally {
    await node.stop(true);
  }
});

test("uses a random port when no port is configured", async () => {
  const calls: ServeOptions[] = [];

  Bun.serve = mock((options: ServeOptions) => {
    calls.push(options);
    return fakeServer(Number(options.port));
  }) as typeof Bun.serve;
  console.log = mock(() => {}) as typeof console.log;

  const node = await Server("random-default", {
    hostname: "127.0.0.1",
    apiKey,
  });

  try {
    expect(calls).toHaveLength(1);
    expect(Number(calls[0].port)).toBeGreaterThan(0);
    expect(node.port).toBe(Number(calls[0].port));
  } finally {
    await node.stop(true);
  }
});
