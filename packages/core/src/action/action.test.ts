import { expect, test, describe } from "bun:test";
import { $ } from "@taskwish/expr";
import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { Actor } from "../actor";
import { TW } from "../core";
import { Step } from "../steps";
import { Logger, InferType, formatEvent, isActionEvent } from "../use";

describe("Action", () => {
  test("no input — plain handler", async () => {
    const { healthz } = Action("healthz").run(function () {
      return { status: "ok" };
    });

    type T = typeof healthz;

    type check = Expect<
      Equal<TW.Action<"healthz", () => Promise<{ status: string }>, null>, T>
    >;

    expect(await healthz()).toEqual({ status: "ok" });
  });

  test("object schema input", async () => {
    const { hello } = Action("hello")
      .input({ name: "string" })

      .run(function () {
        return `Hello ${this.input.name}`;
      });

    type T = typeof hello;

    type check = Expect<
      Equal<
        TW.Action<"hello", (input: { name: string }) => Promise<string>, null>,
        T
      >
    >;

    expect(await hello({ name: "World" })).toEqual("Hello World");
  });

  test("step chain — yields each step, resolves to last", async () => {
    const { hello } = Action("hello")
      .input({ name: "string" })

      .run(
        Step("fistStep", function () {
          return this.input.name.length;
        }),

        Step("secondStep", function () {
          return this.fistStep > 0;
        }),
      );

    type T = typeof hello;

    type check = Expect<
      Equal<
        TW.Action<"hello", (input: { name: string }) => Promise<boolean>, null>,
        T
      >
    >;

    expect(await hello({ name: "World" })).toEqual(true);

    const yields: unknown[] = [];

    for await (const v of hello.stream({ name: "World" })) {
      yields.push(v);
    }

    expect(yields).toEqual([
      { ">": "hello", input: { name: "World" } },
      { ">": "hello.fistStep", result: 5 },
      { ">": "hello.secondStep", result: true },
      { ">": "hello", result: true },
    ]);
  });

  test("TypeScript type input", async () => {
    const { tsAction } = Action("tsAction")
      .input<{ name: string }>()

      .run(async function () {
        return `Hello ${this.input.name}`;
      });

    type T = typeof tsAction;

    type check = Expect<
      Equal<
        TW.Action<
          "tsAction",
          (input: { name: string }) => Promise<Promise<string>>,
          null
        >,
        T
      >
    >;

    expect(await tsAction({ name: "Test" })).toEqual("Hello Test");
  });

  test("generic function signature — this.input is args tuple", async () => {
    const { genericAction } = Action("genericAction")
      .sig<<const T>(lorem: T) => Promise<T>>()

      .run(async function () {
        const [lorem] = this.input;
        const a = this.get(AbortSignal);

        return lorem;
      });

    type T = typeof genericAction;

    type check = Expect<
      Equal<
        TW.Action<"genericAction", <const T>(lorem: T) => Promise<T>, null>,
        T
      >
    >;

    expect(await genericAction("gpt")).toEqual("gpt");
  });

  test("HKT handler", async () => {
    interface MyHandler extends TW.Handler {
      run<const T extends this["ctx"]["model"]>(lorem: T): Promise<number>;
    }

    const { myHandler } = Action("myHandler")
      .sig<MyHandler>()

      .run(async function () {
        const [lorem] = this.input;
        return lorem.length;
      });

    type T = typeof myHandler;

    type check = Expect<
      Equal<
        TW.Action<
          "myHandler",
          <const T extends "gpt5">(lorem: T) => Promise<number>,
          Record<"handler", MyHandler>
        >,
        T
      >
    >;

    expect(await myHandler("gpt5")).toEqual(4);
  });

  test("mixed handlers — steps and async generator yield in order", async () => {
    const { mixed } = Action("mixed")
      .input({ name: "string" })

      .run(
        Step("first", function () {
          return 42;
        }),

        Step("stream", async function* () {
          yield "x";
          yield "y";

          return "Y";
        }),

        Step("third", function () {
          return true;
        }),
      );

    const yields: unknown[] = [];
    for await (const v of mixed.stream({ name: "World" })) {
      yields.push(v);
    }
    expect(yields).toEqual([
      { ">": "mixed", input: { name: "World" } },
      { ">": "mixed.first", result: 42 },
      "x",
      "y",
      { ">": "mixed.stream", result: "Y" },
      { ">": "mixed.third", result: true },
      { ">": "mixed", result: true },
    ]);
    expect(await mixed({ name: "World" })).toEqual(true);
  });

  test("step error — yields step error, action error, then rethrows", async () => {
    const boom = new Error("boom");

    const { failing } = Action("failing")
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
      { ">": "failing", input: { name: "World" } },
      { ">": "failing.first", result: 1 },
      { ">": "failing.bad", error: boom },
      { ">": "failing", error: boom },
    ]);
    expect(thrown).toBe(boom);
  });

  test("Logger — logs each event via provided function", async () => {
    const logged: unknown[] = [];
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

    const { healthz } = Action("healthz")
      .use(Logger(spy))

      .run(function () {
        return { status: "ok" };
      });

    await healthz();

    expect(logged).toEqual([
      "",
      formatEvent({ ">": "healthz", input: undefined }),
      formatEvent({ ">": "healthz", result: { status: "ok" } }),
      "",
    ]);
  });

  test("Logger — stream also logs", async () => {
    const logged: unknown[] = [];
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

    const { hello } = Action("hello")
      .use(Logger(spy))

      .input({ name: "string" })

      .run(function () {
        return `Hello ${this.input.name}`;
      });

    const yields: unknown[] = [];

    for await (const v of hello.stream({ name: "World" })) {
      yields.push(v);
    }

    expect(logged).toEqual(
      yields.flatMap((v) => {
        if (typeof v !== "object" || v === null || !(">" in (v as object)))
          return [v];
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

  test("Logger — logs Step events", async () => {
    const logged: unknown[] = [];
    const spy = {
      log: logged.push.bind(logged),
      info: logged.push.bind(logged),
      error: logged.push.bind(logged),
    };

    const { compute } = Action("compute")
      .use(Logger(spy))

      .input({ value: "number" })

      .run(
        Step("double", function () {
          return this.input.value * 2;
        }),

        Step("positive", function () {
          return this.double > 0;
        }),
      );

    await compute({ value: 3 });

    expect(logged).toEqual([
      "",
      formatEvent({ ">": "compute", input: { value: 3 } }),
      formatEvent({ ">": "compute.double", result: 6 }),
      formatEvent({ ">": "compute.positive", result: true }),
      formatEvent({ ">": "compute", result: true }),
      "",
    ]);
  });

  test("InferType — .run() returns steps as typed tuple", () => {
    const { compute } = Action("compute")
      .use(InferType())

      .input({ name: "string", thread: { sender: { name: "string" } } })

      .run(
        Step("gent", function () {
          return this.actions.generateText({
            model: "gpt5",
            prompt: `hello ${this.input.thread.sender.name}`,
          });
        }),

        Step("reply", function () {
          return this.actions.generateText({
            model: "gpt5",
            prompt: `reply to ${this.gent} from ${this.input.thread.sender.name}`,
          });
        }),

        Step("positive", function () {
          return this.gent.length > 2;
        }),

        Step("done", function () {
          return this.reply === this.input.name;
        }),
      );

    type T = typeof compute;

    type check = Expect<
      Equal<
        T,
        {
          ">": "Command";
          "=": "compute";
          run: [
            TW.ActionStep<
              "gent",
              "generateText",
              { model: "gpt5"; prompt: string }
            >,
            TW.ActionStep<
              "reply",
              "generateText",
              { model: "gpt5"; prompt: string }
            >,
            TW.ScriptStep<"positive", () => boolean>,
            TW.ScriptStep<"done", () => boolean>,
          ];
        }
      >
    >;

    expect(compute).toEqual({
      ">": "Command",
      "=": "compute",
      run: [
        {
          $: "generateText",
          "=": "gent",
          model: "gpt5",
          prompt: "hello @{input.thread.sender.name}",
        },
        {
          $: "generateText",
          "=": "reply",
          model: "gpt5",
          prompt: "reply to @{gent} from @{input.thread.sender.name}",
        },
        {
          $: "step",
          "=": "positive",
          run: "@{function() {\nreturn this.gent.length > 2;\n}}",
        },
        {
          $: "step",
          "=": "done",
          run: "@{function() {\nreturn this.reply === this.input.name;\n}}",
        },
      ],
    });
  });

  test("InferType — .run() returns steps as typed tuple", () => {
    const { compute } = Action("compute")
      .use(InferType("positive"))

      .input({ name: "string", thread: { sender: { name: "string" } } })

      .run(
        Step("gent", function () {
          return this.actions.generateText({
            model: "gpt5",
            prompt: `hello ${this.input.thread.sender.name}`,
          });
        }),

        Step("reply", function () {
          return this.actions.generateText({
            model: "gpt5",
            prompt: `reply to ${this.gent} from ${this.input.name}`,
          });
        }),

        Step("positive", function () {
          return this.gent.length > 2;
        }),

        Step("done", function () {
          return this.reply === this.input.name;
        }),
      );

    type InferScope<A> =
      A extends TW.ScriptStep<any, infer H>
        ? H extends (this: infer U, ...args: any[]) => any
          ? U
          : never
        : never;

    type ExactOmit<T, K extends keyof T> = {
      [P in keyof T as P extends K ? never : P]: T[P];
    };

    type T = ExactOmit<
      InferScope<typeof compute>,
      "thread" | "actions" | "self" | "signal" | "get" | "event"
    >;

    type check = Expect<
      Equal<
        T,
        {
          reply: string;
          gent: string;
          input: {
            name: string;
            thread: {
              sender: {
                name: string;
              };
            };
          };
        }
      >
    >;

    // cast needed because the declared type narrows non-matching positions to
    // `undefined`, while the runtime value still carries the full step objects
    expect(compute).toEqual({
      $: "step",
      "=": "positive",
      run: "@{function() {\nreturn this.gent.length > 2;\n}}",
    });
  });

  test("use(TW.Action) — bare Action (no Actor) injected directly as this.actions.<name>", async () => {
    // Bare Action — no Actor wrapper; flat name → this.actions.notify (directly callable)
    const { notify } = Action("notify")
      .input({ message: "string" })

      .run(function () {
        return `sent: ${this.input.message}`;
      });

    const { greet } = Action("greet")
      .use(notify)

      .input({ name: "string" })

      .run(async function () {
        // flat name → this.actions.notify (direct, not nested)
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
        const result = await this.actions.notify({ message: this.input.name });

        return `Hello, ${result}`;
      });

    expect(await greet({ name: "World" })).toEqual("Hello, sent: World");
  });

  test("use(TW.Action) — Actor-service action injected into this.actions.<service>.<method>", async () => {
    // Actor-created: TW.Name = "Notifier::notify" → this.actions.notifier.notify
    const { Notifier } = Actor("Notifier");

    const { notify } = Notifier()
      .on("Command", "notify")

      .input({ message: "string" })

      .run(function () {
        return `sent: ${this.input.message}`;
      });

    const { greet } = Action("greet")
      .use(notify)

      .input({ name: "string" })

      .run(async function () {
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
        const result = await this.actions.notifier.notify({
          message: this.input.name,
        });

        return `Hello, ${result}`;
      });

    expect(await greet({ name: "World" })).toEqual("Hello, sent: World");
  });

  test("use(object) — injects TW.Actions and ignores non-action exports", async () => {
    const { notify } = Action("notify")
      .input({ message: "string" })

      .run(function () {
        return `sent: ${this.input.message}`;
      });

    const { greet } = Action("greet")
      .use(
        Promise.resolve({
          notify,
          helper: () => "ignored",
          version: "1.0.0",
        }),
      )

      .input({ name: "string" })

      .run(async function () {
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
        type HelperIsIgnored = "helper" extends keyof typeof this.actions
          ? false
          : true;
        type HelperCheck = Expect<Equal<HelperIsIgnored, true>>;

        return this.actions.notify({ message: this.input.name });
      });

    expect(await greet({ name: "World" })).toEqual("sent: World");
  });

  test("meta options can use an injected conversationsList action for Slack.postMessage", async () => {
    const channels = [
      { id: "C123", name: "general" },
      { id: "C456", name: "engineering" },
    ];

    const { conversationsList } = Action("conversationsList")
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

    const { channelIds } = Action("channelIds")
      .input({ types: "string" })

      .run(function () {
        return {
          channels: channels.map((channel) => channel.id),
          parent: {
            nested: channels.map((channel) => channel.id),
          },
        };
      });

    const { numericChannelsList } = Action("numericChannelsList")
      .input({ types: "string" })

      .run(function () {
        return {
          ok: true,
          channels: [
            { id: 123, name: "general" },
            { id: 456, name: "engineering" },
          ],
        };
      });

    Action("pathSuggestions")
      .use(channelIds)

      .input({ channel: "string", nested: "string" })

      .run(function () {
        return { ok: true };
      })

      .meta({
        input: {
          channel: {
            suggestions: {
              $: "channelIds",
              "*": $("channels"),
              types: "public_channel",
            },
          },
          nested: {
            suggestions: {
              $: "channelIds",
              "*": $("parent"),
              types: "public_channel",
            },
          },
        },
      });

    Action("numericChannelSuggestions")
      .use(numericChannelsList)

      .input({ channel: "number" })

      .run(function () {
        return { ok: true };
      })

      .meta({
        input: {
          channel: {
            suggestions: {
              $: "numericChannelsList",
              "*": $("channels").map(["x"], ["x.name", "x.id"]),
              types: "public_channel",
            },
          },
        },
      });

    const { postMessage } = Action("postMessage")
      .use(conversationsList)

      .input({ channel: "string", text: "string" })

      .run(async function () {
        const response = await this.actions.conversationsList({
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
              $: "conversationsList",
              "*": $("channels").map(["x"], ["x.name", "x.id"]),
              types: "public_channel",
            },
          },
          text: {
            description: "Message text",
            example: "Deploy completed",
          },
        },
        output: {
          channel: "The selected channel",
          text: "The posted message",
        },
      });

    Action("invalidMeta")
      .input({ channel: "string", text: "string" })

      .run(function () {
        return { ok: true };
      })

      .meta({
        input: {
          // @ts-expect-error metadata input keys must exist in the action scope input
          missing: "Not an action input",
        },
      });

    Action("invalidOutputMeta")
      .input({ channel: "string" })

      .run(function () {
        return { ok: true };
      })

      .meta({
        output: {
          // @ts-expect-error metadata output keys must exist in the action result
          missing: "Not an action output",
        },
      });

    Action("invalidSuggestionField")
      .use(conversationsList)

      .input({ channel: "string" })

      .run(function () {
        return { ok: true };
      })

      .meta({
        input: {
          channel: {
            suggestions: {
              $: "conversationsList",
              // @ts-expect-error mapped fields must use item dot paths
              "*": $("channels").map(["x"], ["x.missing", "x.id"]),
              types: "public_channel",
            },
          },
        },
      });

    Action("invalidLegacySuggestionPath")
      .use(conversationsList)

      .input({ channel: "string" })

      .run(function () {
        return { ok: true };
      })

      .meta({
        input: {
          channel: {
            suggestions: {
              $: "conversationsList",
              // @ts-expect-error suggestion paths use dot-path syntax and mapped fields use arrays
              "*": [".channels[]", [".name", ".id"]],
              types: "public_channel",
            },
          },
        },
      });

    Action("unconstrainedSuggestionValue")
      .use(conversationsList)

      .input({ channel: "number" })

      .run(function () {
        return { ok: true };
      })

      .meta({
        input: {
          channel: {
            suggestions: {
              $: "conversationsList",
              "*": $("channels").map(["x"], ["x.name", "x.id"]),
              types: "public_channel",
            },
          },
        },
      });

    const meta = postMessage[TW.Meta];
    expect(meta.description).toEqual("Post a message to a Slack channel");
    expect(JSON.parse(JSON.stringify(meta.input.channel.suggestions))).toEqual({
      $: "conversationsList",
      "*": ["channels.map", ["x"], ["x.name", "x.id"]],
      types: "public_channel",
    });
    expect(meta.output.channel).toEqual("The selected channel");
    expect(
      await postMessage({ channel: "C456", text: "Deploy completed" }),
    ).toEqual({
      channel: { id: "C456", name: "engineering" },
      text: "Deploy completed",
    });
  });

  test("async generator — stream yields each value", async () => {
    const { greet } = Action("greet")
      .input({ name: "string" })

      .run(async function* () {
        yield this.input.name;
        yield this.input.name.toUpperCase();
      });

    type StreamYield =
      ReturnType<typeof greet.stream> extends AsyncGenerator<infer Y, any>
        ? Y
        : never;

    type check = Expect<
      Equal<
        StreamYield,
        string | TW.StepEvent<unknown> | TW.ActionEvent<"greet", void>
      >
    >;

    const values: StreamYield[] = [];
    for await (const v of greet.stream({ name: "hello" })) {
      values.push(v);
    }
    expect(values).toEqual([
      { ">": "greet", input: { name: "hello" } },
      "hello",
      "HELLO",
      { ">": "greet", result: undefined },
    ]);
  });
});
