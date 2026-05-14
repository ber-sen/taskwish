import { expect, test, describe } from "bun:test";
import { Expect, Equal } from "./helpers";
import { Actor, HttpEvent } from "./actor";
import { TW } from "./core";
import { Step } from "./steps";
import { Event } from "./event";
import { Logger, formatEvent, isActionEvent } from "./use";

describe("Actor", () => {
  test("Command — plain handler with input", async () => {
    const { Greeter } = Actor("Greeter");

    const { greet } = Greeter()
      .on("Command", "greet")

      .input({ name: "string" })

      .run(function () {
        return `Hello ${this.input.name}`;
      });

    type T = typeof greet;
    type check = Expect<
      Equal<
        TW.Action<"greet", (input: { name: string }) => Promise<string>, null>,
        T
      >
    >;

    expect(await greet({ name: "World" })).toEqual("Hello World");
  });

  test("Command — no input", async () => {
    const { Pinger } = Actor("Pinger");

    const { healthz } = Pinger()
      .on("Command", "healthz")

      .run(function () {
        return { status: "ok" };
      });

    expect(await healthz()).toEqual({ status: "ok" });
  });

  test("Command — step chain resolves to last step", async () => {
    const { Processor } = Actor("Processor");

    const { process } = Processor()
      .on("Command", "process")

      .input({ value: "number" })

      .run(
        Step("doubled", function () {
          return this.input.value * 2;
        }),

        Step("positive", function () {
          return this.doubled > 0;
        }),
      );

    type T = typeof process;
    type check = Expect<
      Equal<
        TW.Action<
          "process",
          (input: { value: number }) => Promise<boolean>,
          null
        >,
        T
      >
    >;

    expect(await process({ value: 3 })).toEqual(true);
  });

  test("actor name prefixed in Action and Step events", async () => {
    const { Pipeline } = Actor("Pipeline");

    const { run } = Pipeline()
      .on("Command", "run")

      .input({ name: "string" })

      .run(
        Step("first", function () {
          return this.input.name.length;
        }),

        Step("second", function () {
          return this.first > 0;
        }),
      );

    const yields: unknown[] = [];
    for await (const v of run.stream({ name: "hello" })) {
      yields.push(v);
    }

    expect(yields).toEqual([
      { ">": "Pipeline.run", input: { name: "hello" } },
      { ">": "Pipeline.run.first", result: 5 },
      { ">": "Pipeline.run.second", result: true },
      { ">": "Pipeline.run", result: true },
    ]);
  });

  test("NewMessage — actor name prefixed, input carries message data", async () => {
    const { Broadcaster } = Actor("Broadcaster");

    const { onNewMessage } = Broadcaster()
      .on("NewMessage")

      .run(function () {
        return this.input.content.toUpperCase();
      });

    type T = typeof onNewMessage;
    type check = Expect<
      Equal<
        TW.Action<
          "onNewMessage",
          (input: {
            sender: { name: string };
            content: string;
            channel: string;
          }) => Promise<string>,
          null
        >,
        T
      >
    >;

    const yields: unknown[] = [];
    for await (const v of onNewMessage.stream({
      sender: { name: "Alice" },
      content: "hi",
      channel: "general",
    })) {
      yields.push(v);
    }

    expect(yields).toEqual([
      {
        ">": "Broadcaster.onNewMessage",
        input: { sender: { name: "Alice" }, content: "hi", channel: "general" },
      },
      { ">": "Broadcaster.onNewMessage", result: "HI" },
    ]);
  });

  test("Command error — yields step error, action error, then rethrows", async () => {
    const boom = new Error("boom");

    const { Crasher } = Actor("Crasher");

    const { failing } = Crasher()
      .on("Command", "failing")

      .input({ name: "string" })

      .run(
        Step("first", function () {
          return 1;
        }),

        Step("bad", function () {
          throw boom;
        }),

        Step("never", function () {
          return 3;
        }),
      );

    const yields: unknown[] = [];
    let thrown: unknown;

    try {
      for await (const v of failing.stream({ name: "World" })) {
        yields.push(v);
      }
    } catch (e) {
      thrown = e;
    }

    expect(yields).toEqual([
      { ">": "Crasher.failing", input: { name: "World" } },
      { ">": "Crasher.failing.first", result: 1 },
      { ">": "Crasher.failing.bad", error: boom },
      { ">": "Crasher.failing", error: boom },
    ]);
    expect(thrown).toBe(boom);
  });

  test("def — custom event usable as on() trigger", async () => {
    const { Biller } = Actor("Biller").def(
      Event("InvoicePaid", { invoiceId: "string", amount: "number" }),
    );

    const { onInvoicePaid } = Biller()
      .on("InvoicePaid")

      .run(function () {
        return `invoice: ${this.input.invoiceId}, amount: ${this.input.amount}`;
      });

    type T = typeof onInvoicePaid;
    type check = Expect<
      Equal<
        TW.Action<
          "onInvoicePaid",
          (input: { invoiceId: string; amount: number }) => Promise<string>,
          null
        >,
        T
      >
    >;

    expect(await onInvoicePaid({ invoiceId: "inv-1", amount: 99 })).toEqual(
      "invoice: inv-1, amount: 99",
    );
  });

  test("def — injects Event scope into behavior handlers", async () => {
    const { Biller } = Actor("Biller").def(
      Event("InvoicePaid", {
        invoiceId: "string",
        amount: "number",
        customer: "string",
      }),
    );

    const { processPayment } = Biller()
      .on("Command", "processPayment")

      .input({ invoiceId: "string" })

      .run(function () {
        expect(typeof this.InvoicePaid.emit).toEqual("function");
        return `processed: ${this.input.invoiceId}`;
      });

    expect(await processPayment({ invoiceId: "inv-123" })).toEqual(
      "processed: inv-123",
    );
  });

  test("def — Event emit yields event data", async () => {
    const { Biller } = Actor("Biller").def(
      Event("InvoicePaid", {
        invoiceId: "string",
        amount: "number",
        customer: "string",
      }),
    );

    const { chargeCustomer } = Biller()
      .on("Command", "chargeCustomer")

      .input({ invoiceId: "string", amount: "number" })

      .run(async function* () {
        yield* this.InvoicePaid.emit({
          invoiceId: this.input.invoiceId,
          amount: this.input.amount,
          customer: "alice",
        });
        return "done";
      });

    const yields: unknown[] = [];
    for await (const v of chargeCustomer.stream({
      invoiceId: "inv-1",
      amount: 100,
    })) {
      yields.push(v);
    }

    expect(yields).toContainEqual({
      ">": "InvoicePaid",
      id: null,
      data: { invoiceId: "inv-1", amount: 100, customer: "alice" },
    });
  });

  test("Schedule — injects this.input with expression and runtime at", async () => {
    const { Scheduler } = Actor("Scheduler");

    const { onSchedule } = Scheduler()
      .on("Schedule", "0 9 * * 1-5")

      .run(function () {
        return `${this.input.expression} fired at ${this.input.at.toISOString()}`;
      });

    type T = typeof onSchedule;
    type check = Expect<
      Equal<
        TW.Action<
          "onSchedule",
          (input: { expression: string; at: Date }) => Promise<string>,
          null
        >,
        T
      >
    >;

    const at = new Date("2026-01-13T09:00:00Z");
    expect(await onSchedule({ expression: "0 9 * * 1-5", at })).toEqual(
      "0 9 * * 1-5 fired at 2026-01-13T09:00:00.000Z",
    );
  });

  test("GET — no schema, input and request are the Request object", async () => {
    const { InvoiceProvider } = Actor("InvoiceProvider");

    const { GET } = InvoiceProvider()
      .on("GET", "/invoices/:id")

      .run(function () {
        return `${this.request.method} ${new URL(this.request.url).pathname}`;
      });

    type T = typeof GET;
    type check = Expect<
      Equal<TW.Action<"GET", (input: Request) => Promise<string>, null>, T>
    >;

    expect(await GET(new Request("http://localhost/invoices/inv-42"))).toEqual(
      "GET /invoices/inv-42",
    );
  });

  test("GET — with schema and command, named action takes flat input and fetch returns Response", async () => {
    const { InvoiceProvider } = Actor("InvoiceProvider").def(
      Event("InvoiceFetched", { id: "string", page: "string" }),
    );

    const { getInvoices } = InvoiceProvider()
      .on("GET", "/invoices/:id", {
        params: { id: "string" },
        query: { page: "string" },
      })

      .command("getInvoices")

      .run(function () {
        return `id=${this.input.id} page=${this.input.page}`;
      });

    type T = typeof getInvoices;
    type check = Expect<
      Equal<
        TW.Action<
          "getInvoices",
          (input: { id: string; page: string }) => Promise<string>,
          {
            route: [
              "GET",
              "/invoices/:id",
              {
                params: {
                  id: "string";
                };
                query: {
                  page: "string";
                };
              },
            ];
          }
        >,
        T
      >
    >;

    expect(await getInvoices({ id: "inv-42", page: "2" })).toEqual(
      "id=inv-42 page=2",
    );

    const directYields: unknown[] = [];
    for await (const v of getInvoices.stream({ id: "inv-42", page: "2" })) {
      directYields.push(v);
    }
    expect(directYields).toEqual([
      { ">": "InvoiceProvider.getInvoices", input: { id: "inv-42", page: "2" } },
      { ">": "InvoiceProvider.getInvoices", result: "id=inv-42 page=2" },
    ]);

    const fetchYields: unknown[] = [];
    for await (const v of getInvoices.fetch.stream(
      new Request("http://localhost/invoices/inv-42?page=2"),
    )) {
      fetchYields.push(v);
    }
    const fetchStreamJson = await (fetchYields[3] as any).result.text();

    expect(fetchYields).toMatchObject([
      { ">": "InvoiceProvider.GET", input: { path: "/invoices/inv-42", params: { id: "inv-42" }, query: { page: "2" } } },
      { ">": "InvoiceProvider.getInvoices", input: { id: "inv-42", page: "2" } },
      { ">": "InvoiceProvider.getInvoices", result: "id=inv-42 page=2" },
      { ">": "InvoiceProvider.GET", result: expect.any(Response) },
    ]);
    expect(fetchStreamJson).toEqual("id=inv-42 page=2");

    const response = await getInvoices.fetch(new Request("http://localhost/invoices/inv-42?page=2"));
    expect(response).toBeInstanceOf(Response);
    expect(await response.text()).toEqual("id=inv-42 page=2");
  });

  test("fetch — object result serialized as application/json", async () => {
    const { InvoiceProvider } = Actor("InvoiceProvider");

    const { getInvoice } = InvoiceProvider()
      .on("GET", "/invoices/:id", { params: { id: "string" } })

      .command("getInvoice")

      .run(function () {
        return { id: this.input.id, status: "paid" };
      });

    const response = await getInvoice.fetch(new Request("http://localhost/invoices/inv-42"));
    expect(response.headers.get("Content-Type")).toEqual("application/json");
    expect(await response.json()).toEqual({ id: "inv-42", status: "paid" });
  });

  test("NewEmail — input carries email fields", async () => {
    const { Mailer } = Actor("Mailer");

    const { onNewEmail } = Mailer()
      .on("NewEmail")

      .run(function () {
        return `New email from ${this.input.from}: ${this.input.subject}`;
      });

    type T = typeof onNewEmail;
    type check = Expect<
      Equal<
        TW.Action<
          "onNewEmail",
          (input: {
            from: string;
            to: string;
            subject: string;
            body: string;
          }) => Promise<string>,
          null
        >,
        T
      >
    >;

    expect(
      await onNewEmail({
        from: "alice@example.com",
        to: "support@co.com",
        subject: "Help",
        body: "...",
      }),
    ).toEqual("New email from alice@example.com: Help");
  });

  test("NewEmail — input available inside Step, events are prefixed", async () => {
    const { MailAgent } = Actor("MailAgent");

    const { onNewEmail } = MailAgent()
      .on("NewEmail")

      .run(
        Step("log", function () {
          return `${this.input.from}: ${this.input.subject}`;
        }),
      );

    const yields: unknown[] = [];
    for await (const v of onNewEmail.stream({
      from: "bob@example.com",
      to: "me@co.com",
      subject: "Invoice",
      body: "",
    })) {
      yields.push(v);
    }

    expect(yields).toEqual([
      {
        ">": "MailAgent.onNewEmail",
        input: {
          from: "bob@example.com",
          to: "me@co.com",
          subject: "Invoice",
          body: "",
        },
      },
      {
        ">": "MailAgent.onNewEmail.log",
        result: "bob@example.com: Invoice",
      },
      {
        ">": "MailAgent.onNewEmail",
        result: "bob@example.com: Invoice",
      },
    ]);
  });

  test("signal — typed from scope, Step yields event then step result, chained step reads value", async () => {
    const { Emitter } = Actor("Emitter").def(
      Event("OrderPlaced", { orderId: "string", amount: "number" }),
    );

    const { emit } = Emitter()
      .on("Command", "emit")

      .input({ orderId: "string", amount: "number" })

      .run(
        Step("order", function () {
          return this.signal("OrderPlaced", {
            orderId: this.input.orderId,
            amount: this.input.amount,
          });
        }),

        Step("confirm", function () {
          return `placed: ${this.order.orderId}`;
        }),
      );

    const yields: unknown[] = [];
    for await (const v of emit.stream({ orderId: "ord-1", amount: 100 })) {
      yields.push(v);
    }

    expect(yields).toEqual([
      {
        ">": "Emitter.emit",
        input: { orderId: "ord-1", amount: 100 },
      },
      { ">": "OrderPlaced", orderId: "ord-1", amount: 100 },
      {
        ">": "Emitter.emit.order",
        result: { ">": "OrderPlaced", orderId: "ord-1", amount: 100 },
      },
      { ">": "Emitter.emit.confirm", result: "placed: ord-1" },
      { ">": "Emitter.emit", result: "placed: ord-1" },
    ]);
  });

  test("use(Logger) — logs Action and Step events in order", async () => {
    const logged: unknown[] = [];
    const spy = { log: logged.push.bind(logged), info: logged.push.bind(logged), error: logged.push.bind(logged) };

    const { Worker } = Actor("Worker");

    const { run } = Worker()
      .use(Logger(spy))

      .on("Command", "run")

      .input({ value: "number" })

      .run(
        Step("doubled", function () {
          return this.input.value * 2;
        }),

        Step("positive", function () {
          return this.doubled > 0;
        }),
      );

    await run({ value: 5 });

    expect(logged).toEqual([
      "",
      formatEvent({ ">": "Worker.run", input: { value: 5 } }),
      formatEvent({ ">": "Worker.run.doubled", result: 10 }),
      formatEvent({ ">": "Worker.run.positive", result: true }),
      formatEvent({ ">": "Worker.run", result: true }),
      "",
    ]);
  });

  test("use(Logger) — stream also logs", async () => {
    const logged: unknown[] = [];
    const spy = { log: logged.push.bind(logged), info: logged.push.bind(logged), error: logged.push.bind(logged) };

    const { Counter } = Actor("Counter");
    const { tick } = Counter()
      .use(Logger(spy))
      .on("Command", "tick")
      .input({ n: "number" })
      .run(
        Step("doubled", function () {
          return this.input.n * 2;
        }),

        Step("positive", function () {
          return this.doubled > 0;
        }),
      );

    const yields: unknown[] = [];
    for await (const v of tick.stream({ n: 3 })) {
      yields.push(v);
    }

    expect(logged).toEqual(
      yields.flatMap((v) => {
        if (typeof v !== "object" || v === null || !(">" in (v as object))) return [v];
        const e = v as Record<string, unknown>;
        const action = isActionEvent(e[">"] as string);
        const out = formatEvent(e);
        const items: unknown[] = [];
        if (action && "input" in e) items.push("");
        items.push(out);
        if (action && ("result" in e || "error" in e)) items.push("");
        return items;
      }),
    );
  });

  test("use(Logger) — applies to all behaviors on the same instance", async () => {
    const logged: unknown[] = [];
    const spy = { log: logged.push.bind(logged), info: logged.push.bind(logged), error: logged.push.bind(logged) };

    const { Hub } = Actor("Hub");
    const hub = Hub().use(Logger(spy));

    const { ping } = hub
      .on("Command", "ping")
      .input({ id: "string" })
      .run(
        Step("upper", function () {
          return this.input.id.toUpperCase();
        }),
      );

    const { onNewMessage } = hub
      .on("NewMessage")
      .run(
        Step("excerpt", function () {
          return this.input.content.slice(0, 3);
        }),
      );

    await ping({ id: "abc" });
    await onNewMessage({ sender: { name: "Alice" }, content: "hello", channel: "general" });

    expect(logged).toEqual([
      "",
      formatEvent({ ">": "Hub.ping", input: { id: "abc" } }),
      formatEvent({ ">": "Hub.ping.upper", result: "ABC" }),
      formatEvent({ ">": "Hub.ping", result: "ABC" }),
      "",
      "",
      formatEvent({ ">": "Hub.onNewMessage", input: { sender: { name: "Alice" }, content: "hello", channel: "general" } }),
      formatEvent({ ">": "Hub.onNewMessage.excerpt", result: "hel" }),
      formatEvent({ ">": "Hub.onNewMessage", result: "hel" }),
      "",
    ]);
  });

  test("multiple behaviors from same actor instance", async () => {
    const { Conductor } = Actor("Conductor");

    const actor = Conductor();

    const { greet } = actor
      .on("Command", "greet")

      .input({ name: "string" })

      .run(function () {
        return `hi ${this.input.name}`;
      });

    const { onNewMention } = actor
      .on("NewMention")

      .run(function () {
        return `mentioned by ${this.input.sender.name}: ${this.input.text}`;
      });

    expect(await greet({ name: "Alice" })).toEqual("hi Alice");
    expect(
      await onNewMention({
        sender: { name: "Bob" },
        text: "hello",
        channel: "general",
      }),
    ).toEqual("mentioned by Bob: hello");
  });
});
