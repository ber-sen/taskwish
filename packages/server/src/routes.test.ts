import { expect, test } from "bun:test";
import { Actor, Event } from "@taskwish/core";
import { Console } from "@taskwish/console";
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

test("exports Bun.serve routes for service dispatch", async () => {
  const { actor } = Actor("Greeter");

  const { hello } = actor()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(function () {
      return `Hello ${this.input.name}`;
    });
  const { Greeter } = actor().service({ hello });

  const routes = await createRoutes(
    createNodeRegistry([Promise.resolve({ Greeter, hello })]),
    { apiKey }
  );

  const route = routeMap(routes, "/tw/Greeter/hello");
  expect(routes["/tw/:target"]).toBeUndefined();

  const response = await route.POST!(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    })
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
});

test("exports actor event handlers as concrete Bun.serve routes", async () => {
  const { Greeter } = Actor("Greeter")
    .scope(Event("Message", { content: "string" }))
    .actor()
    .service();
  const { onGreeterMessage } = Actor("Biller")
    .use(Greeter)
    .actor()
    .on("Greeter::Message")
    .run(function () {
      return { received: this.input.content };
    });
  const { Biller } = Actor("Biller")
    .use(Greeter)
    .actor()
    .service({ onGreeterMessage });

  const routes = await createRoutes(
    createNodeRegistry([Promise.resolve({ Greeter, Biller })]),
    { apiKey }
  );

  const route = routeMap(routes, "/tw/Biller/on-greeter-message");
  expect(routes["/tw/:target"]).toBeUndefined();

  const response = await route.POST!(
    new Request("http://localhost/tw/Biller/on-greeter-message", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hi" }),
    })
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: "hi" });
});

test("does not export console routes by default", async () => {
  const routes = await createRoutes(createNodeRegistry([]), { apiKey });

  expect(routes["/"]).toBeUndefined();
  expect(routes["/*"]).toBeUndefined();
  expect(routes["/tw/console/config"]).toBeUndefined();
});

test("exports console config when the app is installed", async () => {
  const { hello } = Actor("Greeter")
    .scope(Event("Message", { content: "string" }))
    .actor()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(function () {
      return `Hello ${this.input.name}`;
    })
    .meta({ description: "Greet a person by name" });
  const { Greeter } = Actor("Greeter")
    .scope(Event("Message", { content: "string" }))
    .actor()
    .service({ hello });

  const { onGreeterMessage } = Actor("Biller")
    .use(Greeter)
    .actor()
    .on("Greeter::Message")
    .run(function () {
      return { received: this.input.content };
    });
  const { Biller } = Actor("Biller")
    .use(Greeter)
    .actor()
    .service({ onGreeterMessage });

  const routes = await createRoutes(
    createNodeRegistry([Promise.resolve({ Greeter, Biller, hello })]),
    { apiKey, nodeName: "test-node", apps: [Console()] }
  );

  const route = routeMap(routes, "/tw/console/config");

  const response = await route.GET!(
    new Request("http://localhost/tw/console/config")
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    nodeName: "test-node",
    apiKey,
    apiPrefix: "/tw",
    mcp: {
      enabled: true,
      endpoints: [
        {
          path: "/actor",
          tools: [
            {
              name: "Greeter.hello",
              action: "Greeter::hello",
              description: "Greet a person by name",
            },
            {
              name: "Biller.onGreeterMessage",
              action: "Biller::onGreeterMessage",
              description: "Invoke Biller::onGreeterMessage",
            },
          ],
        },
      ],
    },
    actions: [
      {
        id: "Greeter::hello",
        actor: "Greeter",
        action: "hello",
        label: "Hello",
        description: "Greet a person by name",
        mode: "form",
        route: "/tw/Greeter/hello",
        source: "local",
        input: [
          {
            name: "name",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        inputSchema: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {
            name: {
              type: "string",
            },
          },
          required: ["name"],
        },
        meta: {
          description: "Greet a person by name",
        },
      },
    ],
  });
});

test("exports live actor state for the console command summary", async () => {
  const routes = await createRoutes(
    Promise.resolve({
      actions: new Map(),
      eventHandlers: new Map(),
      states: new Map([
        ["Todos", { state: { items: [{ id: "one", done: false }] } }],
      ]),
    }),
    { apiKey, nodeName: "test-node", apps: [Console()] }
  );

  const route = routeMap(routes, "/tw/console/state");
  const response = await route.GET!(
    new Request("http://localhost/tw/console/state")
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([
    {
      actor: "Todos",
      state: { items: [{ id: "one", done: false }] },
    },
  ]);
});

test("forwards disabled MCP configuration to console apps", async () => {
  const routes = await createRoutes(createNodeRegistry([]), {
    apiKey,
    nodeName: "test-node",
    apps: [Console()],
    mcp: false,
  });

  const route = routeMap(routes, "/tw/console/config");
  const response = await route.GET!(
    new Request("http://localhost/tw/console/config"),
  );
  const config = (await response.json()) as { mcp: unknown };

  expect(config.mcp).toEqual({ enabled: false, endpoints: [] });
});
