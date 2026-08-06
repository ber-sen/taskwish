import { expect, test } from "bun:test";
import { Actor, Event, formatEvent, Logger, Step, TW } from "@taskwish/core";
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

test("streams Step pipe chunks from command actions", async () => {
  const { Piper } = Actor("Piper");
  let releaseSecondChunk!: () => void;
  const waitForRelease = new Promise<void>((resolve) => {
    releaseSecondChunk = resolve;
  });

  const { count } = Piper()
    .on("Command", "count")

    .input({ total: "number" })

    .run(
      Step("count", async function* () {
        yield "1\n";
        await waitForRelease;
        yield "2\n";
      }),

      Step(["|>", "double"], async function* (source) {
        for await (const chunk of source) {
          yield `${Number(chunk) * 2}\n`;
        }
      }),
    );

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ Piper, count })]),
    { apiKey },
  );

  const responseOrTimeout = await Promise.race([
    fetch(
      new Request("http://localhost/tw/Piper/count?total=2", {
        headers: auth,
      }),
    ),
    Bun.sleep(50).then(() => "timeout" as const),
  ]);

  if (responseOrTimeout === "timeout") {
    releaseSecondChunk();
    throw new Error("Piper response did not start streaming");
  }

  const response = responseOrTimeout;
  expect(response.status).toBe(200);
  const reader = response.body!.getReader();
  const firstOrTimeout = await Promise.race([
    reader.read(),
    Bun.sleep(50).then(() => "timeout" as const),
  ]);

  if (firstOrTimeout === "timeout") {
    releaseSecondChunk();
    throw new Error("Piper response did not produce the first chunk");
  }

  expect(firstOrTimeout.done).toBe(false);
  expect(new TextDecoder().decode(firstOrTimeout.value)).toBe("2\n");

  releaseSecondChunk();

  const second = await reader.read();
  expect(second.done).toBe(false);
  expect(new TextDecoder().decode(second.value)).toBe("4\n");

  expect(await reader.read()).toEqual({ done: true, value: undefined });
});

test("logs traces when invoking command actions through fetch handlers", async () => {
  const logged: unknown[] = [];
  const spy = {
    log: logged.push.bind(logged),
    info: logged.push.bind(logged),
    error: logged.push.bind(logged),
  };
  const { Greeter } = Actor("Greeter");

  const { hello } = Greeter()
    .use(Logger(spy))
    
    .on("Command", "hello")

    .input({ name: "string" })

    .run(
      Step("prepare", function () {
        return this.input.name.toUpperCase();
      }),

      Step("greet", function () {
        return `Hello ${this.prepare}`;
      }),
    );

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
  expect(await response.text()).toBe("Hello ADA");
  expect(logged).toEqual([
    formatEvent({ ">>": "Greeter::hello", input: { name: "Ada" } }),
    formatEvent({ ">>": "Greeter::hello.prepare", result: "ADA" }),
    formatEvent({ ">>": "Greeter::hello.greet", result: "Hello ADA" }),
    formatEvent({ ">>": "Greeter::hello", result: "Hello ADA" }),
  ]);
});

test("serves actor event handlers with POST under /tw/<Actor>/<handler>", async () => {
  const { Greeter } = Actor("Greeter").scope(
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
  const { Greeter } = Actor("Greeter").scope(
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
