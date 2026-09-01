import { expect, test } from "bun:test";
import { Actor } from "@taskwish/core";
import { createNodeRegistry, createRoutes } from "./index";
import { apiKey, auth } from "./test-helpers";
import type { NodeRouteMap, NodeRoutes } from "./types";

function routeMap(routes: NodeRoutes, path: string): NodeRouteMap {
  const route = routes[path];
  expect(route).toBeDefined();
  if (!route || route instanceof Response || "index" in route) {
    throw new Error(`Expected route handlers for ${path}`);
  }
  return route;
}

async function mcpRequest(
  routes: NodeRoutes,
  path: string,
  body: Record<string, unknown>,
): Promise<{ response: Response; message: any }> {
  const response = await routeMap(routes, path).POST!(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        ...auth,
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
        "MCP-Protocol-Version": "2025-06-18",
      },
      body: JSON.stringify(body),
    }),
  );
  const text = await response.text();
  const data = text
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice(6);
  return { response, message: JSON.parse(data ?? text) };
}

function greeterActions() {
  const { actor } = Actor("Greeter");
  const { hello } = actor()
    .on("Command", "hello")
    .input({ name: "string" })
    .run(function () {
      return { greeting: `Hello ${this.input.name}` };
    })
    .meta({ description: "Greet a person" });
  const { goodbye } = actor()
    .on("Command", "goodbye")
    .input({ name: "string" })
    .run(function () {
      return `Goodbye ${this.input.name}`;
    });
  const { Greeter } = actor().service({ hello, goodbye });
  return { Greeter, hello, goodbye };
}

test("exposes every action as an authenticated MCP tool at /actor", async () => {
  const { Greeter } = greeterActions();
  const routes = await createRoutes(createNodeRegistry([{ Greeter }]), {
    apiKey,
    nodeName: "test-node",
  });

  const unauthorized = await routeMap(routes, "/actor").POST!(
    new Request("http://localhost/actor", { method: "POST" }),
  );
  expect(unauthorized.status).toBe(401);

  const { response, message } = await mcpRequest(routes, "/actor", {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });

  expect(response.status).toBe(200);
  expect(message.result.tools).toEqual([
    {
      name: "Greeter.hello",
      description: "Greet a person",
      inputSchema: {
        type: "object",
        $schema: "https://json-schema.org/draft/2020-12/schema",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
      _meta: { "taskwish/action": "Greeter::hello" },
    },
    {
      name: "Greeter.goodbye",
      description: "Invoke Greeter::goodbye",
      inputSchema: {
        type: "object",
        $schema: "https://json-schema.org/draft/2020-12/schema",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
      _meta: { "taskwish/action": "Greeter::goodbye" },
    },
  ]);
});

test("calls MCP tools through the TaskWish action runtime", async () => {
  const { Greeter } = greeterActions();
  const routes = await createRoutes(createNodeRegistry([{ Greeter }]), {
    apiKey,
    nodeName: "test-node",
  });

  const { message } = await mcpRequest(routes, "/actor", {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "Greeter.hello",
      arguments: { name: "Ada" },
    },
  });

  expect(message.result).toEqual({
    content: [{ type: "text", text: '{"greeting":"Hello Ada"}' }],
    structuredContent: { greeting: "Hello Ada" },
  });
});

test("supports custom MCP URLs with handpicked actions", async () => {
  const { Greeter, goodbye } = greeterActions();
  const routes = await createRoutes(createNodeRegistry([{ Greeter }]), {
    apiKey,
    nodeName: "test-node",
    mcp: { path: "/greeter", tools: [goodbye] },
  });

  expect(routes["/actor"]).toBeUndefined();
  const { message } = await mcpRequest(routes, "/greeter", {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/list",
    params: {},
  });
  expect(message.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
    "Greeter.goodbye",
  ]);
});

test("can disable the MCP endpoint", async () => {
  const routes = await createRoutes(createNodeRegistry([]), {
    apiKey,
    mcp: false,
  });
  expect(routes["/actor"]).toBeUndefined();
});
