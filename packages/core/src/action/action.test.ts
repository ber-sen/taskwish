import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { Taskwish } from "../types";
import { Message } from "../../../message/message";
import { Provide } from "./provide";

describe("Action", () => {
  it("works with arrow functions", async () => {
    const succeed = Action("Succeed").handler(() => ({ success: true }));

    type T = typeof succeed;

    type succeed = Expect<
      Equal<
        Taskwish.NullaryAction<
          () => {
            success: boolean;
          },
          ["action", "Succeed"]
        >,
        T
      >
    >;

    const result = await succeed();

    expect(result).toEqual({ success: true });
  });

  it("works with schema", async () => {
    const succeed = Action("Succeed")
      .handler((params: { name: string }) => ({
        success: true,
      }))

      .meta({ description: "asdasa", input: { name: "name parameter" } });

    type T = typeof succeed;

    type succeed = Expect<
      Equal<
        Taskwish.Action<
          (params: { name: string }) => {
            success: boolean;
          },
          ["action", "Succeed"],
          {
            readonly description: "asdasa";
            readonly input: {
              readonly name: "name parameter";
            };
          }
        >,
        T
      >
    >;

    const result = await succeed({ name: "asda" });

    expect(result).toEqual({ success: true });
  });

  it("works with array type", async () => {
    const succeed = Action(["io", "Succeed"]).handler(() => ({
      success: true,
    }));

    type T = typeof succeed;

    type succeed = Expect<
      Equal<
        Taskwish.NullaryAction<
          () => {
            success: boolean;
          },
          ["action", "io", "Succeed"]
        >,
        T
      >
    >;

    const result = await succeed();

    expect(result).toEqual({ success: true });
  });

  it("works with params", async () => {
    const sayHello = Action("Say hello").handler(
      (params: { language: string }) => {
        return `Hello in ${params.language}`;
      },
    );

    type T = typeof sayHello;

    type sayHello = Expect<
      Equal<
        Taskwish.Action<
          (params: { language: string }) => string,
          ["action", "Say hello"]
        >,
        T
      >
    >;

    const result = await sayHello({ language: "Spanish" });

    expect(result).toEqual("Hello in Spanish");
  });

  it("works with provided scope", async () => {
    const sayHello = Action("Say hello").handler(
      (params: { language: string }) => {
        return `Hello in ${params.language}`;
      },
    );

    const scope = [Provide("env", process.env)] as const;

    type T = typeof sayHello;

    type sayHello = Expect<
      Equal<
        Taskwish.Action<
          (params: { language: string }) => string,
          ["action", "Say hello"]
        >,
        T
      >
    >;

    const result = await sayHello(...scope, { language: "Spanish" });

    expect(result).toEqual("Hello in Spanish");
  });

  it("works with generators", async () => {
    const streamNumbers = Action("Stream").handler(async function* () {
      yield Message([
        { type: "text", text: "asd" },
        { type: "text", text: "asdasd" },
      ]);
      yield 2;
      yield 3;
    });

    type T = typeof streamNumbers;

    for await (const n of streamNumbers()) {
      console.log(n);
    }
  });

  it("works with dynamic env", async () => {
    const dynamicEnv = Action("Stream").handler(async function* () {
      const env = yield* Use(Env("API_KEY", "string"));

      return Boolean(env);
    });

    type T = typeof dynamicEnv;

    type dynamicEnv = Expect<
      Equal<
        Taskwish.NullaryAction<
          () => AsyncGenerator<
            never,
            boolean,
            Taskwish.Use<
              Taskwish.Struct<
                {
                  API_KEY: string;
                },
                ["env"]
              >
            >
          >,
          ["action", "Stream"]
        >,
        T
      >
    >;
  });

  it("works with AbortSignal", async () => {
    const dynamicRequire = Action("Stream").handler(async function* () {
      const signal = yield* this(AbortSignal);

      return signal.aborted;
    });

    type T = typeof dynamicRequire;

    type dynamicRequire = Expect<
      Equal<
        Taskwish.NullaryAction<
          () => AsyncGenerator<unknown, boolean, AbortSignal>,
          ["action", "Stream"],
          null
        >,
        T
      >
    >;
  });

  it("works with require env", async () => {
    const dynamicRequire = Action("Stream").handler(async function* ({}: {
      lorem: string;
    }) {
      const io = yield* this(Taskwish.IO);

      io.messages;
    });

    type T = typeof dynamicRequire;

    type dynamicRequire = Expect<
      Equal<
        Taskwish.Action<
          (
            {}: {
              lorem: string;
            },
          ) => AsyncGenerator<unknown, void, Taskwish.IO>,
          ["action", "Stream"],
          null
        >,
        T
      >
    >;
  });
});

type Action<Scope> = {
  readonly run: (scope: Scope) => string;
};

type Apply<F extends Taskwish.GenericHandler, scope> = (F & {
  readonly scope: scope;
})["bind"];

const handler =
  <const S extends unknown[]>() =>
  <const M extends S[0], const T extends S[1]>({
    model,
    trip,
  }: {
    model: M;
    trip: T;
  }) => ({
    model,
    trip,
  });

const makeScoped = (fn: typeof handler) =>
  class extends Taskwish.GenericHandler {
    handler = fn;
    declare bind: typeof this.handler<
      [Taskwish.Generic<this, "model">, Taskwish.Generic<this, "trip">]
    >;
  };

const acls = makeScoped(handler);

const a = new acls();

// const l = a.handler({ model: "asdasd", lorem: 2, trip: 3 });

type P = Apply<typeof a, { model: "gpt-5" | "grok"; trip: string }>;

const oo: P = {} as never;

const ooo = oo();

const ddd = ooo({ model: "gpt-5", trip: "SAdads" });
