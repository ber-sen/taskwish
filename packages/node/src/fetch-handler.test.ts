import { expect, test } from "bun:test";
import { Actor, Event, TW } from "@taskwish/core";
import { createFetchHandler, createNodeRegistry } from "./index";
import { apiKey, auth } from "./test-helpers";

test("serves command actions with POST under /tw/<Actor>/<method>", async () => {
  const { Greeter } = Actor("Greeter");

  const { hello } = Greeter()
    .on("Command", "hello")

    .input({ name: "string" })

    .run(function () {
      return `Hello ${this.input.name}`;
    });

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ Greeter, hello })]),
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
    createNodeRegistry([Promise.resolve({ Greeter, hello })]),
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
    createNodeRegistry([
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
    createNodeRegistry([
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

test("serves route actions from node fetch handlers", async () => {
  const { InvoiceProvider } = Actor("InvoiceProvider");

  const { getInvoices } = InvoiceProvider()
    .on("GET", "/invoices/:id", {
      params: { id: "string" },
      query: { page: "string" },
    })
    .command("getInvoices")
    .run(function () {
      return { id: this.input.id, page: this.input.page };
    });

  expect("fetch" in getInvoices).toBe(false);

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ InvoiceProvider, getInvoices })]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/invoices/inv-42?page=2", {
      headers: auth,
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: "inv-42", page: "2" });
});

test("serves route action JSON body input from node fetch handlers", async () => {
  const { InvoiceProvider } = Actor("InvoiceProvider");

  const { createInvoice } = InvoiceProvider()
    .on("POST", "/invoices", {
      body: { id: "string", status: "string" },
    })
    .command("createInvoice")
    .run(function () {
      return { id: this.input.id, status: this.input.status };
    });

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ InvoiceProvider, createInvoice })]),
    { apiKey },
  );

  const response = await fetch(
    new Request("http://localhost/invoices", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: "inv-42", status: "paid" }),
    }),
  );

  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toStartWith("application/json");
  expect(await response.json()).toEqual({ id: "inv-42", status: "paid" });
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
    createNodeRegistry([Promise.resolve({ Greeter, hello })]),
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
