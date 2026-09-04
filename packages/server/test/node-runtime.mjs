import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { Server } from "../dist/index.mjs";

test("serves TaskWish routes with Node.js", async () => {
  const server = await Server("Node runtime test", {
    apiKey: "node-test-key",
    hostname: "127.0.0.1",
    port: 0,
    workspace: [],
    apps: [
      {
        routes() {
          return {
            "/echo": {
              POST: async (request) => Response.json(await request.json()),
            },
          };
        },
      },
    ],
  });

  try {
    const response = await fetch(new URL("/not-found", server.url));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Not Found" });

    const echo = await fetch(new URL("/echo", server.url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runtime: "node" }),
    });
    assert.equal(echo.status, 200);
    assert.deepEqual(await echo.json(), { runtime: "node" });
  } finally {
    await server.stop(true);
  }
});

test("falls back when a requested port is occupied in Node.js", async () => {
  const occupied = createServer();
  await new Promise((resolve, reject) => {
    occupied.once("error", reject);
    occupied.listen(0, "127.0.0.1", resolve);
  });
  const occupiedPort = occupied.address().port;

  let taskwish;
  try {
    taskwish = await Server("Node port fallback test", {
      hostname: "127.0.0.1",
      port: occupiedPort,
      workspace: [],
    });
    assert.notEqual(taskwish.port, occupiedPort);
  } finally {
    if (taskwish) await taskwish.stop(true);
    await new Promise((resolve, reject) =>
      occupied.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
