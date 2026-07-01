import { expect, test, describe } from "bun:test";
import { $ } from "@taskwish/expr";
import { Expect, Equal } from "./helpers";
import { Actor } from "./actor";
import { Action } from "./action";
import { TW } from "./core";
import { Step } from "./steps";
import { Event } from "./event";
import { Logger, formatEvent, isActionEvent } from "./use";
import { Trait } from "./trait";

function markEvents(value: unknown): any {
  if (Array.isArray(value)) return value.map(markEvents);
  if (value === null || typeof value !== "object") return value;
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;

  const entries = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, markEvents(entry)]),
  );

  return "->" in value ? { [TW.$]: "event", ...entries } : entries;
}

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
        TW.Action<
          "Greeter::greet",
          (input: { name: string }) => Promise<string>,
          null
        >,
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
          "Processor::process",
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

    expect(yields).toEqual(markEvents([
      { "->": "Pipeline::run", input: { name: "hello" } },
      { "->": "Pipeline::run.first", result: 5 },
      { "->": "Pipeline::run.second", result: true },
      { "->": "Pipeline::run", result: true },
    ]));
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
          "Broadcaster::on_new_message",
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

    expect(yields).toEqual(markEvents([
      {
        "->": "Broadcaster::on_new_message",
        input: { sender: { name: "Alice" }, content: "hi", channel: "general" },
      },
      { "->": "Broadcaster::on_new_message", result: "HI" },
    ]));
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

    expect(yields).toEqual(markEvents([
      { "->": "Crasher::failing", input: { name: "World" } },
      { "->": "Crasher::failing.first", result: 1 },
      { "->": "Crasher::failing.bad", error: boom },
      { "->": "Crasher::failing", error: boom },
    ]));
    expect(thrown).toBe(boom);
  });

  test("def — custom event usable as on() trigger", async () => {
    const { Biller } = Actor("Biller").def(
      Event("InvoicePaid", { invoiceId: "string", amount: "number" }),
    );

    const { InvoicePaid } = Biller.events;
    type E = typeof InvoicePaid;
    type eventCheck = Expect<
      Equal<
        TW.EventKind<
          "Biller::InvoicePaid",
          { invoiceId: string; amount: number }
        >,
        E
      >
    >;
    expect(InvoicePaid[TW.Name]).toEqual("Biller::InvoicePaid");

    const { onBillerInvoicePaid } = Biller()
      .on("Biller::InvoicePaid")

      .run(function () {
        return `invoice: ${this.input.invoiceId}, amount: ${this.input.amount}`;
      });

    type T = typeof onBillerInvoicePaid;
    type check = Expect<
      Equal<
        TW.Action<
          "Biller::on_biller_invoice_paid",
          (input: { invoiceId: string; amount: number }) => Promise<string>,
          null
        >,
        T
      >
    >;

    expect(
      await onBillerInvoicePaid({ invoiceId: "inv-1", amount: 99 }),
    ).toEqual("invoice: inv-1, amount: 99");
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

    expect(yields).toContainEqual(markEvents({
      "->": "Biller::InvoicePaid",
      id: null,
      data: { invoiceId: "inv-1", amount: 100, customer: "alice" },
    }));
  });

  test("use — imports another actor's event as a trigger", async () => {
    const invoicePaidSchema = {
      invoiceId: "string",
      amount: "number",
      customer: "string",
    } as const;

    const { Biller } = Actor("Biller").def(
      Event("InvoicePaid", invoicePaidSchema),
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

    const { Listener } = Actor("Listener").use(Biller);

    const { onBillerInvoicePaid } = Listener()
      .on("Biller::InvoicePaid")

      .run(function () {
        return `${this.input.customer}:${this.input.invoiceId}`;
      });

    type T = typeof onBillerInvoicePaid;
    type check = Expect<
      Equal<
        TW.Action<
          "Listener::on_biller_invoice_paid",
          (input: {
            invoiceId: string;
            amount: number;
            customer: string;
          }) => Promise<string>,
          null
        >,
        T
      >
    >;

    const emitted: unknown[] = [];
    for await (const event of chargeCustomer.stream({
      invoiceId: "inv-1",
      amount: 100,
    })) {
      emitted.push(event);
    }

    expect(emitted).toContainEqual(markEvents({
      "->": "Biller::InvoicePaid",
      id: null,
      data: { invoiceId: "inv-1", amount: 100, customer: "alice" },
    }));
    expect(
      await onBillerInvoicePaid({
        invoiceId: "inv-1",
        amount: 100,
        customer: "alice",
      }),
    ).toEqual("alice:inv-1");
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
          "Scheduler::on_schedule",
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
      Equal<
        TW.Action<
          "InvoiceProvider::get",
          (input: Request) => Promise<string>,
          null
        >,
        T
      >
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
        return {
          id: this.input.id,
          page: this.input.page,
        };
      })

      .meta({
        description: "Get an invoice by id",
        input: {
          id: {
            description: "Invoice identifier",
            example: "inv-42",
          },
          page: {
            description: "Result page",
            example: "2",
          },
        },
        output: {
          id: "Invoice identifier",
          page: "Result page",
        },
      });

    InvoiceProvider()
      .on("GET", "/invoices/:id", {
        params: { id: "string" },
        query: { page: "string" },
      })

      .command("invalidMeta")

      .run(function () {
        return { ok: true };
      })

      .meta({
        input: {
          // @ts-expect-error metadata input keys must exist in the command scope input
          missing: "Not a command input",
        },
      });

    type T = typeof getInvoices;
    type check = Expect<
      Equal<
        TW.Action<
          "InvoiceProvider::get_invoices",
          (input: { id: string; page: string }) => Promise<{
            id: string;
            page: string;
          }>,
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
                description: "Get an invoice by id";
                input: {
                  id: {
                    description: "Invoice identifier";
                    example: "inv-42";
                  };
                  page: {
                    description: "Result page";
                    example: "2";
                  };
                };
                output: {
                  id: "Invoice identifier";
                  page: "Result page";
                };
              },
            ];
          }
        >,
        T
      >
    >;

    expect(await getInvoices({ id: "inv-42", page: "2" })).toEqual({
      id: "inv-42",
      page: "2",
    });
    expect(getInvoices[TW.Meta]).toEqual({
      route: [
        "GET",
        "/invoices/:id",
        {
          params: { id: "string" },
          query: { page: "string" },
          description: "Get an invoice by id",
          input: {
            id: {
              description: "Invoice identifier",
              example: "inv-42",
            },
            page: {
              description: "Result page",
              example: "2",
            },
          },
          output: {
            id: "Invoice identifier",
            page: "Result page",
          },
        },
      ],
    });

    const directYields: unknown[] = [];
    for await (const v of getInvoices.stream({ id: "inv-42", page: "2" })) {
      directYields.push(v);
    }
    expect(directYields).toEqual(markEvents([
      {
        "->": "InvoiceProvider::get_invoices",
        input: { id: "inv-42", page: "2" },
      },
      {
        "->": "InvoiceProvider::get_invoices",
        result: { id: "inv-42", page: "2" },
      },
    ]));

    const fetchYields: any[] = [];
    for await (const v of getInvoices.fetch.stream(
      new Request("http://localhost/invoices/inv-42?page=2"),
    )) {
      fetchYields.push(v);
    }
    const fetchStreamJson = await fetchYields[3].result.text();

    expect(fetchYields).toMatchObject(markEvents([
      {
        "->": "InvoiceProvider::get",
        input: {
          path: "/invoices/inv-42",
          params: { id: "inv-42" },
          query: { page: "2" },
        },
      },
      {
        "->": "InvoiceProvider::get_invoices",
        input: { id: "inv-42", page: "2" },
      },
      {
        "->": "InvoiceProvider::get_invoices",
        result: { id: "inv-42", page: "2" },
      },
      { "->": "InvoiceProvider::get", result: expect.any(Response) },
    ]));
    expect(JSON.parse(fetchStreamJson)).toEqual({ id: "inv-42", page: "2" });

    const response = await getInvoices.fetch(
      new Request("http://localhost/invoices/inv-42?page=2"),
    );
    expect(response).toBeInstanceOf(Response);
    expect(await response.json()).toEqual({ id: "inv-42", page: "2" });
  });

  test("fetch — object result serialized as application/json", async () => {
    const { InvoiceProvider } = Actor("InvoiceProvider");

    const { getInvoice } = InvoiceProvider()
      .on("GET", "/invoices/:id", { params: { id: "string" } })

      .command("getInvoice")

      .run(function () {
        return { id: this.input.id, status: "paid" };
      });

    const response = await getInvoice.fetch(
      new Request("http://localhost/invoices/inv-42"),
    );
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
          "Mailer::on_new_email",
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

    expect(yields).toEqual(markEvents([
      {
        "->": "MailAgent::on_new_email",
        input: {
          from: "bob@example.com",
          to: "me@co.com",
          subject: "Invoice",
          body: "",
        },
      },
      {
        "->": "MailAgent::on_new_email.log",
        result: "bob@example.com: Invoice",
      },
      {
        "->": "MailAgent::on_new_email",
        result: "bob@example.com: Invoice",
      },
    ]));
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
          return this.signal("Emitter::OrderPlaced", {
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

    expect(yields).toEqual(markEvents([
      {
        "->": "Emitter::emit",
        input: { orderId: "ord-1", amount: 100 },
      },
      { "->": "Emitter::OrderPlaced", orderId: "ord-1", amount: 100 },
      {
        "->": "Emitter::emit.order",
        result: { "->": "Emitter::OrderPlaced", orderId: "ord-1", amount: 100 },
      },
      { "->": "Emitter::emit.confirm", result: "placed: ord-1" },
      { "->": "Emitter::emit", result: "placed: ord-1" },
    ]));
  });

  test("use(Logger) — logs Action and Step events in order", async () => {
    const logged: unknown[] = [];
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

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
      formatEvent({ "->": "Worker::run", input: { value: 5 } }),
      formatEvent({ "->": "Worker::run.doubled", result: 10 }),
      formatEvent({ "->": "Worker::run.positive", result: true }),
      formatEvent({ "->": "Worker::run", result: true }),
      "",
    ]);
  });

  test("use(Logger) — stream also logs", async () => {
    const logged: unknown[] = [];
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

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
        if (typeof v !== "object" || v === null || !("->" in (v as object)))
          return [v];
        const e = v as Record<string, unknown>;
        const action = isActionEvent(e["->"] as string);
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
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

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

    const { onNewMessage } = hub.on("NewMessage").run(
      Step("excerpt", function () {
        return this.input.content.slice(0, 3);
      }),
    );

    await ping({ id: "abc" });
    await onNewMessage({
      sender: { name: "Alice" },
      content: "hello",
      channel: "general",
    });

    expect(logged).toEqual([
      "",
      formatEvent({ "->": "Hub::ping", input: { id: "abc" } }),
      formatEvent({ "->": "Hub::ping.upper", result: "ABC" }),
      formatEvent({ "->": "Hub::ping", result: "ABC" }),
      "",
      "",
      formatEvent({
        "->": "Hub::on_new_message",
        input: {
          sender: { name: "Alice" },
          content: "hello",
          channel: "general",
        },
      }),
      formatEvent({ "->": "Hub::on_new_message.excerpt", result: "hel" }),
      formatEvent({ "->": "Hub::on_new_message", result: "hel" }),
      "",
    ]);
  });

  test("multiple behaviors from same actor instance", async () => {
    const { Conductor } = Actor("Conductor");

    const { greet } = Conductor()
      .on("Command", "greet")

      .input({ name: "string" })

      .run(function () {
        return `hi ${this.input.name}`;
      });

    const { onNewMention } = Conductor()
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

  describe("use(object) — scoped action injection", () => {
    test("meta options can use an injected conversationsList action for Slack.postMessage", async () => {
      const channels = [
        { id: "C123", name: "general" },
        { id: "C456", name: "engineering" },
      ];

      const { Slack } = Actor("Slack");

      const { conversationsList } = Slack()
        .on("Command", "conversationsList")

        .input({ types: "string" })

        .run(function () {
          return {
            ok: true,
            channels:
              this.input.types === "public_channel"
                ? channels
                : channels.slice(1),
          };
        });

      const { postMessage } = Actor("Slack")
        .use(conversationsList)

        .on("Command", "postMessage")

        .input({ channel: "string", text: "string" })

        .run(async function () {
          const response = await this.actions.slack.conversationsList({
            types: "public_channel",
          });
          const selected = response.channels.find(
            (item) => item.id === this.input.channel,
          );

          return {
            channel: selected,
            text: this.input.text,
          };
        })

        .meta({
          description: "Post a message to a Slack channel",
          input: {
            channel: {
              description: "Channel receiving the message",
              example: "#general",
              suggestions: {
                $: "Slack::conversations_list",
                "*": $("channels").map(["x"], ["x.name", "x.id"]),
                types: "public_channel",
              },
            },
            text: {
              description: "Message text",
              example: "Deploy completed",
            },
          },
        });

      const meta = postMessage[TW.Meta];
      expect(meta.description).toEqual("Post a message to a Slack channel");
      expect(
        JSON.parse(JSON.stringify(meta.input.channel.suggestions)),
      ).toEqual({
        $: "Slack::conversations_list",
        "*": ["channels.map", ["x"], ["x.name", "x.id"]],
        types: "public_channel",
      });
      expect(
        await postMessage({ channel: "C456", text: "Deploy completed" }),
      ).toEqual({
        channel: { id: "C456", name: "engineering" },
        text: "Deploy completed",
      });
    });

    test("groups TW.Actions by service name under this.actions.<service>.<method>", async () => {
      // ── build a real TW.Action from a service actor ───────────────────────
      const { Notifier } = Actor("Notifier");

      const { notify } = Notifier()
        .on("Command", "notify")

        .input({ message: "string" })

        .run(function () {
          return `sent: ${this.input.message}`;
        });

      // ── inject into a consumer actor ──────────────────────────────────────
      const { Consumer } = Actor("Consumer").use(notify);

      const { run } = Consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(function () {
          // Type-check: this.actions.notifier.notify must be typed as the action
          type Check = Expect<
            Equal<
              typeof this.actions.notifier.notify,
              TW.Action<
                "Notifier::notify",
                (input: { message: string }) => Promise<string>,
                null
              >
            >
          >;
          // Runtime: call the injected action from a step
          return this.actions.notifier.notify({ message: this.input.text });
        });

      expect(await run({ text: "hello" })).toEqual("sent: hello");
    });

    test("merges actions from multiple .use() calls preserving prior services", async () => {
      const { Emailer } = Actor("Emailer");

      const { sendEmail } = Emailer()
        .on("Command", "sendEmail")

        .input({ to: "string" })

        .run(function () {
          return `email→${this.input.to}`;
        });

      const { Texter } = Actor("Texter");

      const { sendText } = Texter()
        .on("Command", "sendText")

        .input({ to: "string" })

        .run(function () {
          return `text→${this.input.to}`;
        });

      const { Dispatcher } = Actor("Dispatcher").use({ sendEmail, sendText });

      const { dispatch } = Dispatcher()
        .on("Command", "dispatch")

        .input({ recipient: "string" })

        .run(async function () {
          const email = await this.actions.emailer.sendEmail({
            to: this.input.recipient,
          });
          const text = await this.actions.texter.sendText({
            to: this.input.recipient,
          });
          return `${email} | ${text}`;
        });

      expect(await dispatch({ recipient: "alice" })).toEqual(
        "email→alice | text→alice",
      );
    });

    test("bare TW.Action (no wrapping object) — use(notify) equivalent to use({ notify })", async () => {
      const { Notifier } = Actor("Notifier");

      const { notify } = Notifier()
        .on("Command", "notify")

        .input({ message: "string" })

        .run(function () {
          return `sent: ${this.input.message}`;
        });

      // Pass the action directly instead of wrapping it
      const { Consumer } = Actor("Consumer").use(notify);

      const { run } = Consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(function () {
          type Check = Expect<
            Equal<
              typeof this.actions.notifier.notify,
              TW.Action<
                "Notifier::notify",
                (input: { message: string }) => Promise<string>,
                null
              >
            >
          >;
          return this.actions.notifier.notify({ message: this.input.text });
        });

      expect(await run({ text: "hello" })).toEqual("sent: hello");
    });

    test("bare TW.Action — destructuring actor name works: const { Consumer } = Actor(...).use(notify)", async () => {
      const { Notifier } = Actor("Notifier");

      const { notify } = Notifier()
        .on("Command", "notify")

        .input({ message: "string" })

        .run(function () {
          return `bare: ${this.input.message}`;
        });

      // Destructure the actor name directly from the .use() result
      const { Consumer } = Actor("Consumer").use(notify);

      const { run } = Consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(function () {
          return this.actions.notifier.notify({ message: this.input.text });
        });

      expect(await run({ text: "world" })).toEqual("bare: world");
    });

    test("bare Action (no Actor) — use(action) injects directly as this.actions.<name>", async () => {
      // Flat name: TW.Name = "notify" → this.actions.notify (directly callable)
      const { notify } = Action("notify")
        .input({ message: "string" })

        .run(function () {
          return `sent: ${this.input.message}`;
        });

      const { Consumer } = Actor("Consumer").use(notify);

      const { run } = Consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(function () {
          type Check = Expect<
            Equal<
              typeof this.actions.notify,
              TW.Action<
                "notify",
                (input: { message: string }) => Promise<string>,
                null
              >
            >
          >;
          return this.actions.notify({ message: this.input.text });
        });

      expect(await run({ text: "hello" })).toEqual("sent: hello");
    });

    test("bare Action — use({ action }) object form also works", async () => {
      const { notify } = Action("notify")
        .input({ message: "string" })

        .run(function () {
          return `sent: ${this.input.message}`;
        });

      const { Consumer } = Actor("Consumer").use({ notify });

      const { run } = Consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(function () {
          return this.actions.notify({ message: this.input.text });
        });

      expect(await run({ text: "world" })).toEqual("sent: world");
    });

    test("non-TW.Action values in .use() object are silently ignored", async () => {
      // Plain object with a mix of action and non-action values
      const { Pinger } = Actor("Pinger");

      const { ping } = Pinger()
        .on("Command", "ping")

        .run(function () {
          return "pong";
        });

      // notAnAction is a plain function without [TW.Name] → should be skipped
      const { Caller } = Actor("Caller").use({
        ping,
        notAnAction: () => "ignored",
      });

      const { run } = Caller()
        .on("Command", "run")

        .run(function () {
          return this.actions.pinger.ping();
        });

      expect(await run()).toEqual("pong");
      // `notAnAction` must NOT appear in actions scope at the type level
      type actions =
        typeof run extends TW.Action<any, any>
          ? never // prevents unused-type-param error
          : never;
      type Check = "notAnAction" extends keyof (typeof Caller extends {
        Caller: () => infer B;
      }
        ? B
        : never)
        ? false
        : true;
    });
  });

  // ── Trait implementation ─────────────────────────────────────────────────────

  describe("trait implementation", () => {
    test("actor implements trait — input type inferred from trait instance", async () => {
      const Logger = Trait<{ log: (input: string) => string }>();

      const { S3Logger } = Actor("S3Logger");

      const { log } = S3Logger(Logger)
        .on("::log")

        .run(function () {
          return `s3: ${this.input}`;
        });

      // Runtime behaviour
      expect(await log("hello")).toEqual("s3: hello");

      // TW.Name is the actor-qualified name
      expect((log as any)[TW.Name]).toBe("S3Logger::log");

      // TW.Meta carries the trait reference
      expect((log as any)[TW.Meta]).toEqual({ trait: "::log" });

      // Type: keyed by method name, qualified action name, trait meta
      type check = Expect<
        Equal<
          typeof log,
          TW.Action<
            "S3Logger::log",
            (input: string) => Promise<string>,
            { trait: "::log" }
          >
        >
      >;
    });

    test("actor implements trait — no-arg method produces no-arg action", async () => {
      const { S3Logger } =
        Actor("S3Logger").use(Trait<{ log: () => string }>());

      const { log } = S3Logger()
        .on("::log")

        .run(function () {
          return "logged";
        });

      expect(await log()).toEqual("logged");
      expect((log as any)[TW.Name]).toBe("S3Logger::log");
      expect((log as any)[TW.Meta]).toEqual({ trait: "::log" });

      type check = Expect<
        Equal<
          typeof log,
          TW.Action<"S3Logger::log", () => Promise<string>, { trait: "::log" }>
        >
      >;
    });

    test("actor use trait — trait actions are added directly to actions scope", () => {
      const Logger = Trait<{ log: () => string }>();

      const { S3Logger } = Actor("S3Logger").use(Logger);

      const { smth } = S3Logger()
        .on("Command", "smth")

        .run(function () {
          return this.actions.log;
        });

      type check = Expect<
        Equal<Awaited<ReturnType<typeof smth>>, typeof Logger.log>
      >;
    });

    test("actor implements trait — multiple methods, input inferred per method", async () => {
      const Storage = Trait<{
        read: (input: string) => string;
        write: (input: { key: string; value: string }) => string;
      }>();

      const { S3Storage } = Actor("S3Storage");

      const { read } = S3Storage(Storage)
        .on("::read")

        .run(function () {
          return `data:${this.input}`;
        });

      const { write } = S3Storage(Storage)
        .on("::write")

        .run(function () {
          return `wrote:${this.input.key}`;
        });

      expect(await read("k")).toEqual("data:k");
      expect(await write({ key: "k", value: "v" })).toEqual("wrote:k");

      expect((read as any)[TW.Name]).toBe("S3Storage::read");
      expect((write as any)[TW.Name]).toBe("S3Storage::write");
      expect((read as any)[TW.Meta]).toEqual({ trait: "::read" });
      expect((write as any)[TW.Meta]).toEqual({ trait: "::write" });

      type checkRead = Expect<
        Equal<
          typeof read,
          TW.Action<
            "S3Storage::read",
            (input: string) => Promise<string>,
            { trait: "::read" }
          >
        >
      >;
      type checkWrite = Expect<
        Equal<
          typeof write,
          TW.Action<
            "S3Storage::write",
            (input: { key: string; value: string }) => Promise<string>,
            { trait: "::write" }
          >
        >
      >;
    });

    test("actor implements trait — dynamic import (Promise<module>) form", async () => {
      const Storage = Trait<{
        read: (input: string) => string;
        write: (input: { key: string; value: string }) => string;
      }>();

      // Simulate `import("./storage.ts")` — a Promise that resolves to the
      // module's named exports (which are trait stubs).
      const StorageImport = Promise.resolve(Storage);

      const { S3Storage } = Actor("S3Storage");

      // Both forms must compile and produce identical types.
      const { read } = S3Storage(StorageImport)
        .on("::read")

        .run(function () {
          return `data:${this.input}`;
        });

      const { write } = S3Storage(StorageImport)
        .on("::write")

        .run(function () {
          return `wrote:${this.input.key}`;
        });

      expect(await read("k")).toEqual("data:k");
      expect(await write({ key: "k", value: "v" })).toEqual("wrote:k");

      expect((read as any)[TW.Name]).toBe("S3Storage::read");
      expect((write as any)[TW.Name]).toBe("S3Storage::write");
      expect((read as any)[TW.Meta]).toEqual({ trait: "::read" });
      expect((write as any)[TW.Meta]).toEqual({ trait: "::write" });

      type checkRead = Expect<
        Equal<
          typeof read,
          TW.Action<
            "S3Storage::read",
            (input: string) => Promise<string>,
            { trait: "::read" }
          >
        >
      >;
      type checkWrite = Expect<
        Equal<
          typeof write,
          TW.Action<
            "S3Storage::write",
            (input: { key: string; value: string }) => Promise<string>,
            { trait: "::write" }
          >
        >
      >;
    });
  });
});
