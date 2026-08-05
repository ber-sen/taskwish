import { expect, test } from "bun:test";
import { Actor, Event } from "@taskwish/core";
import { CommandCenter } from "@taskwish/cmd";
import { createNodeRegistry, createRoutes } from "./index";
import { apiKey, auth } from "./test-helpers";
import type { NodeRouteMap, NodeRoutes } from "./types";

function routeMap(
  routes: NodeRoutes,
  path: string,
): NodeRouteMap {
  const route = routes[path];
  expect(route).toBeDefined();
  if (!route || route instanceof Response || "index" in route) {
    throw new Error(`Expected route handlers for ${path}`);
  }
  return route;
}

test("exports Bun.serve routes for service dispatch", async () => {
  const { Greeter } = Actor("Greeter");
  
  const { hello } = Greeter()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(function () {
      return `Hello ${this.input.name}`;
    });

  const routes = await createRoutes(
    createNodeRegistry([Promise.resolve({ Greeter, hello })]),
    { apiKey },
  );

  const route = routeMap(routes, "/tw/Greeter/hello");
  expect(routes["/tw/:target"]).toBeUndefined();

  const response = await route.POST!(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
});

test("exports actor event handlers as concrete Bun.serve routes", async () => {
  const { Greeter } = Actor("Greeter").scope(
    Event("Message", { content: "string" }),
  );
  const { Biller } = Actor("Biller").use(Greeter);
  const { onGreeterMessage } = Biller()
    .on("Greeter::Message")
    .run(function () {
      return { received: this.input.content };
    });

  const routes = await createRoutes(
    createNodeRegistry([
      Promise.resolve({ Greeter, Biller, onGreeterMessage }),
    ]),
    { apiKey },
  );

  const route = routeMap(routes, "/tw/Biller/on-greeter-message");
  expect(routes["/tw/:target"]).toBeUndefined();

  const response = await route.POST!(
    new Request("http://localhost/tw/Biller/on-greeter-message", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hi" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: "hi" });
});

test("does not export command center routes by default", async () => {
  const routes = await createRoutes(createNodeRegistry([]), { apiKey });

  expect(routes["/"]).toBeUndefined();
  expect(routes["/*"]).toBeUndefined();
  expect(routes["/tw/cmd/config"]).toBeUndefined();
});

test("exports command center config when the app is installed", async () => {
  const { Greeter } = Actor("Greeter").scope(
    Event("Message", { content: "string" }),
  );
  const { Biller } = Actor("Biller").use(Greeter);

  const { hello } = Greeter()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(function () {
      return `Hello ${this.input.name}`;
    })
    .meta({ description: "Greet a person by name" });
  const { onGreeterMessage } = Biller()
    .on("Greeter::Message")
    .run(function () {
      return { received: this.input.content };
    });

  const routes = await createRoutes(
    createNodeRegistry([
      Promise.resolve({ Greeter, Biller, hello, onGreeterMessage }),
    ]),
    { apiKey, nodeName: "test-node", apps: [CommandCenter()] },
  );

  const route = routeMap(routes, "/tw/cmd/config");

  const response = await route.GET!(
    new Request("http://localhost/tw/cmd/config"),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    nodeName: "test-node",
    apiKey,
    apiPrefix: "/tw",
    actions: [
      {
        id: "Greeter::hello",
        actor: "Greeter",
        action: "hello",
        label: "Hello",
        description: "Greet a person by name",
        color: expect.stringMatching(/^hsl\(\d+ 85% 40%\)$/),
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
