import { expect, test } from "bun:test";
import { Action, Actor, Event, Step, TW } from "@taskwish/core";
import {
  createFetchHandler,
  createRoutes,
  createServiceRegistry,
} from "./index";

const apiKey = "test-api-key";
const auth = { Authorization: `Bearer ${apiKey}` };

test("serves command actions with POST under /tw/<Actor>/<method>", async () => {
  const { Greeter } = Actor("Greeter");

  const { hello } = Greeter()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(function () {
      return `Hello ${this.input.name}`;
    });

  const fetch = createFetchHandler(
    createServiceRegistry([Promise.resolve({ Greeter, hello })]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
});

test("serves command actions with GET under /tw/<Actor>/<method>", async () => {
  const { Greeter } = Actor("Greeter");

  const { hello } = Greeter()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(function () {
      return `Hello ${this.input.name}`;
    });

  const fetch = createFetchHandler(
    createServiceRegistry([Promise.resolve({ Greeter, hello })]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello?name=Ada", {
      headers: auth,
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
});

test("serves actor event handlers with POST under /tw/<Actor>/<handler>", async () => {
  const { Greeter } = Actor("Greeter").def(
    Event("Message", { content: "string" }),
  );
  const { Biller } = Actor("Biller").use(Greeter);

  const { onGreeterMessage } = Biller()
    .on("Greeter::Message")

    .run(function () {
      return { received: this.input.content };
    });

  expect(onGreeterMessage[TW.Meta]).toEqual({ event: "Greeter::Message" });

  const fetch = createFetchHandler(
    createServiceRegistry([
      Promise.resolve({ Greeter, Biller, onGreeterMessage }),
    ]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Biller/on-greeter-message", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hi" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: "hi" });
});

test("serves actor event handlers with GET under /tw/<Actor>/<handler>", async () => {
  const { Greeter } = Actor("Greeter").def(
    Event("Message", { content: "string" }),
  );

  const { Biller } = Actor("Biller").use(Greeter);

  const { onGreeterMessage } = Biller()
    .on("Greeter::Message")

    .run(function () {
      return { received: this.input.content };
    });

  const fetch = createFetchHandler(
    createServiceRegistry([
      Promise.resolve({ Greeter, Biller, onGreeterMessage }),
    ]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Biller/on-greeter-message?content=hi", {
      headers: auth,
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ received: "hi" });
});

test("dispatches stream signal events to registered handlers without waiting", async () => {
  const { Greeter } = Actor("Greeter").def(
    Event("Message", { content: "string" }),
  );
  const { Biller } = Actor("Biller").use(Greeter);

  let resolveReceived!: (value: string) => void;
  const received = new Promise<string>((resolve) => {
    resolveReceived = resolve;
  });
  let releaseHandler!: () => void;
  const handlerCanFinish = new Promise<void>((resolve) => {
    releaseHandler = resolve;
  });

  const { hello } = Greeter()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(
      Step("notify", function () {
        return this.signal("Greeter::Message", { content: this.input.name });
      }),

      Step("notify", function () {
        return `Hello ${this.input.name}`;
      }),
    );

  const { onGreeterMessage } = Biller()
    .on("Greeter::Message")

    .run(async function () {
      resolveReceived(this.input.content);

      await handlerCanFinish;

      return { received: this.input.content };
    });

  const fetch = createFetchHandler(
    createServiceRegistry([
      Promise.resolve({ Greeter, Biller, hello, onGreeterMessage }),
    ]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
  expect(await received).toBe("Ada");
  releaseHandler();
});

test("ignores non-Event objects yielded with signal shape", async () => {
  const { Greeter } = Actor("Greeter").def(
    Event("Message", { content: "string" }),
  );
  const { Biller } = Actor("Biller").use(Greeter);
  const received: string[] = [];

  const { hello } = Greeter()
    .on("Command", "hello")

    .run(async function* () {
      yield { "->": "Greeter::Message", content: "Ada" };

      return "Hello Ada";
    });

  const { onGreeterMessage } = Biller()
    .on("Greeter::Message")

    .run(function () {
      received.push(this.input.content);
    });

  const fetch = createFetchHandler(
    createServiceRegistry([
      Promise.resolve({ Greeter, Biller, hello, onGreeterMessage }),
    ]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: auth,
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("Hello Ada");
  expect(received).toEqual([]);
});

test("returns the stream final value instead of a yielded result event", async () => {
  const { Greeter } = Actor("Greeter");

  const { streamed } = Greeter()
    .on("Command", "streamed")

    .run(async function* () {
      yield { ">>": "Greeter::streamed", result: "yielded result" };

      return "final value";
    });

  const fetch = createFetchHandler(
    createServiceRegistry([Promise.resolve({ streamed })]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/streamed", {
      method: "POST",
      headers: auth,
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("final value");
});

test("rejects requests without the configured API key", async () => {
  const { Greeter } = Actor("Greeter");
  const { hello } = Greeter()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(function () {
      return `Hello ${this.input.name}`;
    });

  const fetch = createFetchHandler(
    createServiceRegistry([Promise.resolve({ Greeter, hello })]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/tw/Greeter/hello", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    }),
  );

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Unauthorized" });
});

test("exports Bun.serve routes for service dispatch", async () => {
  const { Greeter } = Actor("Greeter");
  const { hello } = Greeter()
    .on("Command", "hello")
    .input({ name: "string" })
    .run(function () {
      return `Hello ${this.input.name}`;
    });

  const routes = await createRoutes(
    createServiceRegistry([Promise.resolve({ Greeter, hello })]),
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
    createServiceRegistry([
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
