import { expect, test } from "bun:test";
import { Actor, Event } from "@taskwish/core";
import { createNodeRegistry, createRoutes } from "./index";
import { apiKey, auth } from "./test-helpers";

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

  const route = routes["/tw/Greeter/hello"];
  expect(route).toBeDefined();
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
  const { Greeter } = Actor("Greeter").def(
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

  const route = routes["/tw/Biller/on-greeter-message"];
  expect(route).toBeDefined();
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
