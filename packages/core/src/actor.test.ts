import { expect, test, describe } from "bun:test";
import { $ } from "@taskwish/expr";
import { Expect, Equal } from "./helpers";
import { Actor } from "./actor";
import { Action } from "./action";
import { TW } from "./core";
import { Step } from "./steps";
import { Event } from "./event";
import { Logger, formatEvent } from "./use";
import { Trait } from "./trait";

const eventData = (value: unknown) =>
  value instanceof TW.Trace || value instanceof TW.Signal ? value.data : value;

const eventDataList = (values: unknown[]) => values.map(eventData);

describe("Actor", () => {
  test("Command — plain handler with input", async () => {
    const { greeter } = Actor("Greeter");

    const { greet } = greeter()
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
    const { pinger } = Actor("Pinger");

    const { healthz } = pinger()
      .on("Command", "healthz")

      .run(function () {
        return { status: "ok" };
      });

    expect(await healthz()).toEqual({ status: "ok" });
  });

  test("Command — step chain resolves to last step", async () => {
    const { processor } = Actor("Processor");

    const { process } = processor()
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
    const { pipeline } = Actor("Pipeline");

    const { run } = pipeline()
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

    expect(eventDataList(yields)).toEqual([
      { ">>": "Pipeline::run", input: { name: "hello" } },
      { ">>": "Pipeline::run.first", result: 5 },
      { ">>": "Pipeline::run.second", result: true },
      { ">>": "Pipeline::run", result: true },
    ]);

    const stream = run.stream({ name: "hello" });
    let item = await stream.next();
    while (!item.done) item = await stream.next();
    expect(item.value).toBe(true);
  });

  test("NewMessage — actor name prefixed, input carries message data", async () => {
    const { broadcaster } = Actor("Broadcaster");

    const { onNewMessage } = broadcaster()
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
          { event: "NewMessage" }
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

    expect(eventDataList(yields)).toEqual([
      {
        ">>": "Broadcaster::on_new_message",
        input: { sender: { name: "Alice" }, content: "hi", channel: "general" },
      },
      { ">>": "Broadcaster::on_new_message", result: "HI" },
    ]);
  });

  test("Command error — yields step error, action error, then rethrows", async () => {
    const boom = new Error("boom");

    const { crasher } = Actor("Crasher");

    const { failing } = crasher()
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

    expect(eventDataList(yields)).toEqual([
      { ">>": "Crasher::failing", input: { name: "World" } },
      { ">>": "Crasher::failing.first", result: 1 },
      { ">>": "Crasher::failing.bad", error: boom },
      { ">>": "Crasher::failing", error: boom },
    ]);
    expect(thrown).toBe(boom);
  });

  test("scope — custom event usable as on() trigger", async () => {
    const { biller } = Actor("Biller").scope(
      Event("InvoicePaid", { invoiceId: "string", amount: "number" }),
    );

    const { InvoicePaid } = biller.events;
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

    const { onBillerInvoicePaid } = biller()
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
          { event: "Biller::InvoicePaid" }
        >,
        T
      >
    >;

    expect(
      await onBillerInvoicePaid({ invoiceId: "inv-1", amount: 99 }),
    ).toEqual("invoice: inv-1, amount: 99");
  });

  test("scope — does not inject EventKind into behavior handlers", async () => {
    const { biller } = Actor("Biller").scope(
      Event("InvoicePaid", {
        invoiceId: "string",
        amount: "number",
        customer: "string",
      }),
    );

    const { processPayment } = biller()
      .on("Command", "processPayment")

      .input({ invoiceId: "string" })

      .run(function () {
        // @ts-expect-error signal kinds are internal metadata, not user scope
        this.InvoicePaid;
        expect("InvoicePaid" in this).toEqual(false);
        return `processed: ${this.input.invoiceId}`;
      });

    expect(await processPayment({ invoiceId: "inv-123" })).toEqual(
      "processed: inv-123",
    );
  });

  test("scope — Signal emit yields signal data", async () => {
    const { biller } = Actor("Biller").scope(
      Event("InvoicePaid", {
        invoiceId: "string",
        amount: "number",
        customer: "string",
      }),
    );

    const { chargeCustomer } = biller()
      .on("Command", "chargeCustomer")

      .input({ invoiceId: "string", amount: "number" })

      .run(
        Step("invoicePaid", function () {
          return this.signal("Biller::InvoicePaid", {
            invoiceId: this.input.invoiceId,
            amount: this.input.amount,
            customer: "alice",
          });
        }),
      );

    const yields: unknown[] = [];
    for await (const v of chargeCustomer.stream({
      invoiceId: "inv-1",
      amount: 100,
    })) {
      yields.push(v);
    }

    const emitted = yields.find(
      (value) =>
        value instanceof TW.Signal &&
        value.data["->"] === "Biller::InvoicePaid",
    );

    expect(emitted).toBeInstanceOf(TW.Signal);
    expect(emitted).toMatchObject({
      data: {
        "->": "Biller::InvoicePaid",
        invoiceId: "inv-1",
        amount: 100,
        customer: "alice",
      },
    });
  });

  test("use — imports another actor's event as a trigger", async () => {
    const invoicePaidSchema = {
      invoiceId: "string",
      amount: "number",
      customer: "string",
    } as const;

    const { biller } = Actor("Biller").scope(
      Event("InvoicePaid", invoicePaidSchema),
    );

    const { chargeCustomer } = biller()
      .on("Command", "chargeCustomer")

      .input({ invoiceId: "string", amount: "number" })

      .run(
        Step("invoicePaid", function () {
          return this.signal("Biller::InvoicePaid", {
            invoiceId: this.input.invoiceId,
            amount: this.input.amount,
            customer: "alice",
          });
        }),
      );

    const { Biller } = biller().service({
      public: [chargeCustomer],
    });

    const { listener } = Actor("Listener").use(Biller);

    const { onBillerInvoicePaid } = listener()
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
          { event: "Biller::InvoicePaid" }
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

    const invoicePaid = emitted.find(
      (value) =>
        value instanceof TW.Signal &&
        value.data["->"] === "Biller::InvoicePaid",
    );

    expect(invoicePaid).toBeInstanceOf(TW.Signal);
    expect(invoicePaid).toMatchObject({
      data: {
        "->": "Biller::InvoicePaid",
        invoiceId: "inv-1",
        amount: 100,
        customer: "alice",
      },
    });
    expect(
      await onBillerInvoicePaid({
        invoiceId: "inv-1",
        amount: 100,
        customer: "alice",
      }),
    ).toEqual("alice:inv-1");
  });

  test("use — imports service scope events from TW.Scope", async () => {
    const { biller } = Actor("Biller").scope(
      Event("InvoicePaid", {
        invoiceId: "string",
        amount: "number",
        customer: "string",
      }),
    );

    const { Biller } = biller().service();

    expect((Biller as any)[TW.Scope].InvoicePaid[TW.Name]).toBe(
      "Biller::InvoicePaid",
    );

    const { listener } = Actor("Listener").use(Biller);

    const { onBillerInvoicePaid } = listener()
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
          { event: "Biller::InvoicePaid" }
        >,
        T
      >
    >;

    expect(
      await onBillerInvoicePaid({
        invoiceId: "inv-1",
        amount: 100,
        customer: "alice",
      }),
    ).toEqual("alice:inv-1");
  });

  test("use — accepts a single event definition and on() accepts EventKind", async () => {
    const { VoiceCall } = Event(
      "VoiceCall",
      {
        callId: "string",
        from: "string",
      },
      (input) => ({
        call: {
          id: input.callId,
          from: input.from,
        },
      }),
    );

    const { agent } = Actor("Agent").use(VoiceCall);

    const { onVoiceCall } = agent()
      .on(VoiceCall)

      .run(function () {
        return `${this.call.id}:${this.input.from}`;
      });

    type T = typeof onVoiceCall;
    type check = Expect<
      Equal<
        TW.Action<
          "Agent::on_voice_call",
          (input: { callId: string; from: string }) => Promise<string>,
          { event: "VoiceCall" }
        >,
        T
      >
    >;

    expect(
      await onVoiceCall({
        callId: "call-1",
        from: "Ada",
      }),
    ).toEqual("call-1:Ada");
  });

  test("Schedule — injects this.input with expression and runtime at", async () => {
    const { scheduler } = Actor("Scheduler");

    const { onSchedule } = scheduler()
      .on("Schedule", "0 9 * * 1-5")

      .run(function () {
        return `${
          this.input.expression
        } fired at ${this.input.at.toISOString()}`;
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

  test("GET — with schema and command, named action takes flat input and route metadata", async () => {
    const { invoiceProvider } = Actor("InvoiceProvider").scope(
      Event("InvoiceFetched", { id: "string", page: "string" }),
    );

    const { getInvoices } = invoiceProvider()
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

    invoiceProvider()
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
    expect(eventDataList(directYields)).toEqual([
      {
        ">>": "InvoiceProvider::get_invoices",
        input: { id: "inv-42", page: "2" },
      },
      {
        ">>": "InvoiceProvider::get_invoices",
        result: { id: "inv-42", page: "2" },
      },
    ]);

    expect("fetch" in getInvoices).toBe(false);
  });

  test("NewEmail — input carries email fields", async () => {
    const { mailer } = Actor("Mailer");

    const { onNewEmail } = mailer()
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
          { event: "NewEmail" }
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
    const { mailAgent } = Actor("MailAgent");

    const { onNewEmail } = mailAgent()
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

    expect(eventDataList(yields)).toEqual([
      {
        ">>": "MailAgent::on_new_email",
        input: {
          from: "bob@example.com",
          to: "me@co.com",
          subject: "Invoice",
          body: "",
        },
      },
      {
        ">>": "MailAgent::on_new_email.log",
        result: "bob@example.com: Invoice",
      },
      {
        ">>": "MailAgent::on_new_email",
        result: "bob@example.com: Invoice",
      },
    ]);
  });

  test("signal — typed from scope, Step yields event then step result, chained step reads value", async () => {
    const { emitter } = Actor("Emitter").scope(
      Event("OrderPlaced", { orderId: "string", amount: "number" }),
    );

    const { emit } = emitter()
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

    expect(yields[1]).toBeInstanceOf(TW.Signal);
    expect(eventDataList(yields)).toEqual([
      {
        ">>": "Emitter::emit",
        input: { orderId: "ord-1", amount: 100 },
      },
      {
        "->": "Emitter::OrderPlaced",
        orderId: "ord-1",
        amount: 100,
      },
      {
        ">>": "Emitter::emit.order",
        result: {
          "->": "Emitter::OrderPlaced",
          orderId: "ord-1",
          amount: 100,
        },
      },
      { ">>": "Emitter::emit.confirm", result: "placed: ord-1" },
      { ">>": "Emitter::emit", result: "placed: ord-1" },
    ]);
  });

  test("use(Logger) — logs Action and Step events in order", async () => {
    const logged: unknown[] = [];
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

    const { worker } = Actor("Worker");

    const { run } = worker()
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
      formatEvent({ ">>": "Worker::run", input: { value: 5 } }),
      formatEvent({ ">>": "Worker::run.doubled", result: 10 }),
      formatEvent({ ">>": "Worker::run.positive", result: true }),
      formatEvent({ ">>": "Worker::run", result: true }),
    ]);
  });

  test("use(Logger) — stream also logs", async () => {
    const logged: unknown[] = [];
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

    const { counter } = Actor("Counter");
    const { tick } = counter()
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
      eventDataList(yields).flatMap((v) => {
        if (typeof v !== "object" || v === null || !(">>" in (v as object)))
          return [v];
        const e = v as Record<string, unknown>;
        const out = formatEvent(e);
        const items: unknown[] = [];
        items.push(out);
        return items;
      }),
    );
  });

  test("use(Logger) — formats signal events without class or symbol metadata", async () => {
    const logged: unknown[] = [];
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

    const { greeter } = Actor("Greeter").scope(
      Event("Message", { content: "string" }),
    );

    const { hello } = greeter()
      .use(Logger(spy))

      .on("Command", "hello")

      .input({ name: "string" })

      .run(function () {
        return this.signal("Greeter::Message", { content: this.input.name });
      });

    await hello({ name: "Ada" });

    expect(logged).toContain(
      formatEvent({ "->": "Greeter::Message", content: "Ada" }),
    );
  });

  test("use(Logger) — applies to all behaviors on the same instance", async () => {
    const logged: unknown[] = [];
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

    const { hub } = Actor("Hub");
    const hubBehavior = hub().use(Logger(spy));

    const { ping } = hubBehavior
      .on("Command", "ping")

      .input({ id: "string" })

      .run(
        Step("upper", function () {
          return this.input.id.toUpperCase();
        }),
      );

    const { onNewMessage } = hubBehavior.on("NewMessage").run(
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
      formatEvent({ ">>": "Hub::ping", input: { id: "abc" } }),
      formatEvent({ ">>": "Hub::ping.upper", result: "ABC" }),
      formatEvent({ ">>": "Hub::ping", result: "ABC" }),
      formatEvent({
        ">>": "Hub::on_new_message",
        input: {
          sender: { name: "Alice" },
          content: "hello",
          channel: "general",
        },
      }),
      formatEvent({ ">>": "Hub::on_new_message.excerpt", result: "hel" }),
      formatEvent({ ">>": "Hub::on_new_message", result: "hel" }),
    ]);
  });

  test("multiple behaviors from same actor instance", async () => {
    const { conductor } = Actor("Conductor");

    const { greet } = conductor()
      .on("Command", "greet")

      .input({ name: "string" })

      .run(function () {
        return `hi ${this.input.name}`;
      });

    const { onNewMention } = conductor()
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

      const { slack } = Actor("Slack");

      const { conversationsList } = slack()
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

      const { Slack } = slack().service({
        public: [conversationsList],
      });

      const { postMessage } = Actor("Slack")
        .use(Slack)

        .on("Command", "postMessage")

        .input({ channel: "string", text: "string" })

        .run(
          Step("channels", function () {
            return this.actions.slack.conversationsList({
              types: "public_channel",
            });
          }),

          Step("message", function () {
            const selected = this.channels.channels.find(
              (item) => item.id === this.input.channel,
            );

            return {
              channel: selected,
              text: this.input.text,
            };
          }),
        )

        .meta({
          description: "Post a message to a Slack channel",
          input: {
            channel: {
              description: "Channel receiving the message",
              example: "#general",
              suggestions: {
                $: "slack.conversationsList",
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
      const channelMeta = meta.input!.channel as {
        suggestions: unknown;
      };
      expect(JSON.parse(JSON.stringify(channelMeta.suggestions))).toEqual({
        $: "slack.conversationsList",
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
      const { notifier } = Actor("Notifier");

      const { notify } = notifier()
        .on("Command", "notify")

        .input({ message: "string" })

        .run(function () {
          return `sent: ${this.input.message}`;
        });

      const { Notifier } = notifier().service({
        public: [notify],
      });

      // ── inject into a consumer actor ──────────────────────────────────────
      const { consumer } = Actor("Consumer").use(Notifier);

      const { run } = consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(
          Step("notify", function () {
            // Type-check: this.actions.notifier.notify must be typed as the action stream
            type Check = Expect<
              Equal<typeof this.actions.notifier.notify, typeof notify.stream>
            >;
            return this.actions.notifier.notify({ message: this.input.text });
          }),
        );

      expect(await run({ text: "hello" })).toEqual("sent: hello");
    });

    test("exports lowercase actor factory and builds public service objects", async () => {
      const { myActor } = Actor("MyActor");

      const { runSteps } = myActor()
        .on("Command", "runSteps")

        .input({ message: "string" })

        .run(
          Step("firstStep", function () {
            return "step 1";
          }),

          Step("lastStep", function () {
            return this.firstStep.length;
          }),
        );

      const { MyActor } = myActor().service({
        public: [runSteps],
      });

      expect(await MyActor.runSteps({ message: "hello" })).toEqual(6);

      const { consumer } = Actor("Consumer").use(MyActor);

      const { run } = consumer()
        .on("Command", "run")

        .input({ message: "string" })

        .run(
          Step("runSteps", function () {
            type Check = Expect<
              Equal<
                typeof this.actions.myActor.runSteps,
                typeof runSteps.stream
              >
            >;
            return this.actions.myActor.runSteps({
              message: this.input.message,
            });
          }),
        );

      expect(await run({ message: "hello" })).toEqual(6);
    });

    test("same actor command can be injected with .use() on a second command", async () => {
      const { slack } = Actor("Slack");

      const { conversationsList } = slack()
        .on("Command", "conversationsList")

        .input({ types: "string" })

        .run(function () {
          return {
            channels:
              this.input.types === "public_channel"
                ? [{ id: "C123", name: "general" }]
                : [],
          };
        });

      const { Slack } = slack().service({
        public: [conversationsList],
      });

      const { postMessage } = slack()
        .on("Command", "postMessage")

        .use(Slack)

        .input({ channel: "string", text: "string" })

        .run(
          Step("channels", async function () {
            type Check = Expect<
              Equal<
                typeof this.actions.slack.conversationsList,
                typeof conversationsList.stream
              >
            >;
            return await this.actions.slack.conversationsList({
              types: "public_channel",
            });
          }),

          Step("message", function () {
            const selected = this.channels.channels.find(
              (item) => item.id === this.input.channel,
            );
            return {
              channel: selected,
              text: this.input.text,
            };
          }),
        );

      expect(await postMessage({ channel: "C123", text: "hello" })).toEqual({
        channel: { id: "C123", name: "general" },
        text: "hello",
      });
    });

    test("same actor command can be injected with .use() on the actor instance", async () => {
      const { slack } = Actor("Slack");

      const { conversationsList } = slack()
        .on("Command", "conversationsList")

        .input({ types: "string" })

        .run(function () {
          return [`channels:${this.input.types}`];
        });

      const { Slack } = slack().service({
        public: [conversationsList],
      });

      const { postMessage } = slack()
        .use(Slack)

        .on("Command", "postMessage")

        .input({ text: "string" })

        .run(
          Step("channels", function () {
            type Check = Expect<
              Equal<
                typeof this.actions.slack.conversationsList,
                typeof conversationsList.stream
              >
            >;
            return this.actions.slack.conversationsList({
              types: "public_channel",
            });
          }),

          Step("message", function () {
            return `${this.input.text} via ${this.channels[0]}`;
          }),
        );

      expect(await postMessage({ text: "hello" })).toEqual(
        "hello via channels:public_channel",
      );
    });

    test("merges actions from multiple .use() calls preserving prior services", async () => {
      const { emailer } = Actor("Emailer");

      const { sendEmail } = emailer()
        .on("Command", "sendEmail")

        .input({ to: "string" })

        .run(function () {
          return `email→${this.input.to}`;
        });
      const { Emailer } = emailer().service({
        public: [sendEmail],
      });

      const { texter } = Actor("Texter");

      const { sendText } = texter()
        .on("Command", "sendText")

        .input({ to: "string" })

        .run(function () {
          return `text→${this.input.to}`;
        });
      const { Texter } = texter().service({
        public: [sendText],
      });

      const { dispatcher } = Actor("Dispatcher").use(Emailer).use(Texter);

      const { dispatch } = dispatcher()
        .on("Command", "dispatch")

        .input({ recipient: "string" })

        .run(
          Step("email", function () {
            return this.actions.emailer.sendEmail({
              to: this.input.recipient,
            });
          }),

          Step("text", function () {
            return this.actions.texter.sendText({
              to: this.input.recipient,
            });
          }),

          Step("message", function () {
            return `${this.email} | ${this.text}`;
          }),
        );

      expect(await dispatch({ recipient: "alice" })).toEqual(
        "email→alice | text→alice",
      );
    });

    test("bare TW.Action (no wrapping object) — use(notify) equivalent to use({ notify })", async () => {
      const { notifier } = Actor("Notifier");

      const { notify } = notifier()
        .on("Command", "notify")

        .input({ message: "string" })

        .run(function () {
          return `sent: ${this.input.message}`;
        });

      // Pass the action directly instead of wrapping it
      const { consumer } = Actor("Consumer").use(notify);

      const { run } = consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(
          Step("notify", function () {
            type Check = Expect<
              Equal<typeof this.actions.notifier.notify, typeof notify.stream>
            >;
            return this.actions.notifier.notify({ message: this.input.text });
          }),
        );

      expect(await run({ text: "hello" })).toEqual("sent: hello");
    });

    test("bare TW.Action — lowercase actor factory works after use(notify)", async () => {
      const { notifier } = Actor("Notifier");

      const { notify } = notifier()
        .on("Command", "notify")

        .input({ message: "string" })

        .run(function () {
          return `bare: ${this.input.message}`;
        });

      // Destructure the actor name directly from the .use() result
      const { consumer } = Actor("Consumer").use(notify);

      const { run } = consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(
          Step("notify", function () {
            return this.actions.notifier.notify({ message: this.input.text });
          }),
        );

      expect(await run({ text: "world" })).toEqual("bare: world");
    });

    test("bare Action (no Actor) — use(action) injects directly as this.actions.<name>", async () => {
      // Flat name: TW.Name = "notify" → this.actions.notify stream
      const { notify } = Action("notify")
        .input({ message: "string" })

        .run(function () {
          return `sent: ${this.input.message}`;
        });

      const { consumer } = Actor("Consumer").use(notify);

      const { run } = consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(
          Step("notify", function () {
            type Check = Expect<
              Equal<typeof this.actions.notify, typeof notify.stream>
            >;
            return this.actions.notify({ message: this.input.text });
          }),
        );

      expect(await run({ text: "hello" })).toEqual("sent: hello");
    });

    test("bare Action — use({ action }) object form also works", async () => {
      const { notify } = Action("notify")
        .input({ message: "string" })

        .run(function () {
          return `sent: ${this.input.message}`;
        });

      const { consumer } = Actor("Consumer").use({ notify });

      const { run } = consumer()
        .on("Command", "run")

        .input({ text: "string" })

        .run(
          Step("notify", function () {
            return this.actions.notify({ message: this.input.text });
          }),
        );

      expect(await run({ text: "world" })).toEqual("sent: world");
    });

    test("non-TW.Action values in .use() object are silently ignored", async () => {
      // Plain object with a mix of action and non-action values
      const { pinger } = Actor("Pinger");

      const { ping } = pinger()
        .on("Command", "ping")

        .run(function () {
          return "pong";
        });

      // notAnAction is a plain function without [TW.Name] → should be skipped
      const { caller } = Actor("Caller").use({
        ping,
        notAnAction: () => "ignored",
      });

      const { run } = caller()
        .on("Command", "run")

        .run(
          Step("ping", function () {
            return this.actions.pinger.ping();
          }),
        );

      expect(await run()).toEqual("pong");
      // `notAnAction` must NOT appear in actions scope at the type level
      type actions = typeof run extends TW.Action<any, any>
        ? never // prevents unused-type-param error
        : never;
      type Check = "notAnAction" extends keyof (typeof caller extends {
        caller: () => infer B;
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

      const { s3Logger } = Actor("S3Logger");

      const { log } = s3Logger()
        .on(Logger.log)

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
      const Logger = Trait<{ log: () => string }>();

      const { s3Logger } = Actor("S3Logger");

      const { log } = s3Logger()
        .on(Logger.log)

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

    test("actor implements trait event — on-method maps to event action", async () => {
      const VoiceCall = Trait<{
        onVoiceCall: (
          chunk: ArrayBuffer,
        ) => Generator<ArrayBuffer, null, unknown>;
      }>();

      const { assistant } = Actor("Assistant");

      const { onVoiceCall } = assistant()
        .on(VoiceCall.VoiceCall)

        .run(function () {
          return this.input.byteLength;
        });

      expect(await onVoiceCall(new ArrayBuffer(4))).toEqual(4);
      expect((onVoiceCall as any)[TW.Name]).toBe("Assistant::on_voice_call");
      expect((onVoiceCall as any)[TW.Meta]).toEqual({
        event: "::VoiceCall",
      });

      type check = Expect<
        Equal<
          typeof onVoiceCall,
          TW.Action<
            "Assistant::on_voice_call",
            (input: ArrayBuffer) => Promise<number>,
            { event: "::VoiceCall" }
          >
        >
      >;
    });

    test("actor implements service trait event through property and self", async () => {
      const VoiceCall = Trait({
        service: "VoiceCall",
        self: "onStream",
      })<{
        onStream: (input: {
          sessionId: string;
          chunk: ArrayBuffer;
        }) => Generator<ArrayBuffer, null, unknown>;
        onConnect: <Result>(input: { sessionId: string }) => Result;
      }>();

      const { assistant } = Actor("Assistant");

      const { onVoiceCallConnect } = assistant()
        .on(VoiceCall.Connect)

        .run(function () {
          return this.input.sessionId.length;
        });

      const { onVoiceCallStream } = assistant()
        .on(VoiceCall)

        .run(function () {
          const sessionId: string = this.input.sessionId;
          const chunk: ArrayBuffer = this.input.chunk;
          // @ts-expect-error stream input does not include arbitrary keys
          this.input.missing;

          return sessionId.length + chunk.byteLength;
        });

      expect(await onVoiceCallConnect({ sessionId: "abc" })).toEqual(3);
      expect(
        await onVoiceCallStream({
          sessionId: "abc",
          chunk: new ArrayBuffer(5),
        }),
      ).toEqual(8);
      expect((onVoiceCallConnect as any)[TW.Name]).toBe(
        "Assistant::on_voice_call_connect",
      );
      expect((onVoiceCallConnect as any)[TW.Meta]).toEqual({
        event: "::VoiceCallConnect",
      });
      expect((onVoiceCallStream as any)[TW.Name]).toBe(
        "Assistant::on_voice_call_stream",
      );
      expect((onVoiceCallStream as any)[TW.Meta]).toEqual({
        event: "::VoiceCallStream",
      });

      type checkConnect = Expect<
        Equal<
          typeof onVoiceCallConnect,
          TW.Action<
            "Assistant::on_voice_call_connect",
            (input: { sessionId: string }) => Promise<number>,
            { event: "::VoiceCallConnect" }
          >
        >
      >;
      type checkCall = Expect<
        Equal<
          typeof onVoiceCallStream,
          TW.Action<
            "Assistant::on_voice_call_stream",
            (input: {
              sessionId: string;
              chunk: ArrayBuffer;
            }) => Promise<number>,
            { event: "::VoiceCallStream" }
          >
        >
      >;
    });

    test("actor use trait — trait actions are added directly to actions scope", () => {
      const Logger = Trait<{ log: () => string }>();

      const { s3Logger } = Actor("S3Logger").use(Logger);

      const { smth } = s3Logger()
        .on("Command", "smth")

        .run(function () {
          return this.actions.log;
        });

      type check = Expect<
        Equal<Awaited<ReturnType<typeof smth>>, typeof Logger.log.stream>
      >;
    });

    test("actor implements trait — multiple methods, input inferred per method", async () => {
      const Storage = Trait<{
        read: (input: string) => string;
        write: (input: { key: string; value: string }) => string;
      }>();

      const { s3Storage } = Actor("S3Storage");

      const { read } = s3Storage()
        .on(Storage.read)

        .run(function () {
          return `data:${this.input}`;
        });

      const { write } = s3Storage()
        .on(Storage.write)

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
