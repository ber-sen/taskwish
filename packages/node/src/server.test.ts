import { expect, test } from "bun:test";
import { Node } from "./index";
import { apiKey } from "./test-helpers";

test("falls back to a random port when the configured port is unavailable", async () => {
  const occupied = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch() {
      return new Response("occupied");
    },
  });

  const node = await Node("fallback", {
    port: occupied.port,
    hostname: "127.0.0.1",
    apiKey,
  });

  try {
    expect(node.port).not.toBe(occupied.port);
    expect(node.port).toBeGreaterThan(0);
  } finally {
    await node.stop(true);
    await occupied.stop(true);
  }
});

test("uses a random port when no port is configured", async () => {
  const node = await Node("random-default", {
    hostname: "127.0.0.1",
    apiKey,
  });

  try {
    expect(node.port).toBeGreaterThan(0);
  } finally {
    await node.stop(true);
  }
});
