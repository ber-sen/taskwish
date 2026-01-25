import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { Taskwish } from "../types";
import { Message } from "../../../message/message";

describe("Action", () => {
  it("works with arrow functions", async () => {
    const { succeed } = Action("Succeed").handler(() => ({ success: true }));

    type T = typeof succeed;

    type succeed = Expect<
      Equal<
        Taskwish.Action<
          "Succeed",
          () => {
            success: boolean;
          },
          null
        >,
        T
      >
    >;

    const result = await succeed();

    expect(result).toEqual({ success: true });
  });

  it("works with schema", async () => {
    const { succeed } = Action("Succeed").handler(
      (params: { name: string }) => ({
        success: true,
      }),
    );

    type T = typeof succeed;

    type succeed = Expect<
      Equal<
        Taskwish.Action<
          "Succeed",
          (params: { name: string }) => {
            success: boolean;
          },
          null
        >,
        T
      >
    >;

    const result = await succeed({ name: "asda" });

    expect(result).toEqual({ success: true });
  });

  it("works with params", async () => {
    const { sayHello } = Action("Say hello").handler(
      (params: { language: string }) => {
        return `Hello in ${params.language}`;
      },
    );

    type T = typeof sayHello;

    type sayHello = Expect<
      Equal<
        Taskwish.Action<
          "Say hello",
          (params: { language: string }) => string,
          null
        >,
        T
      >
    >;

    const result = await sayHello({ language: "Spanish" });

    expect(result).toEqual("Hello in Spanish");
  });

  it("works with generators", async () => {
    const { myAction } = Action("my action").handler(async function* () {
      yield Message([
        { type: "text", text: "asd" },
        { type: "text", text: "asdasd" },
      ]);
      yield 2;
      yield 3;
    });

    type T = typeof myAction;

    for await (const n of myAction()) {
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
    const { streamer } = Action("streamer").handler(async function* () {
      const signal = yield* this(AbortSignal);

      return signal.aborted;
    });

    type T = typeof streamer;

    type dynamicRequire = Expect<
      Equal<
        Taskwish.Action<
          "streamer",
          (
            this: Taskwish.Scope<{}>,
          ) => AsyncGenerator<unknown, boolean, AbortSignal>,
          null
        >,
        T
      >
    >;
  });

  it("works with generic", async () => {
    const dynamicRequire = Action("Stream").handler(async function* ({}: {
      lorem: string;
    }) {
      const io = yield* this(Taskwish.IO);

      io.messages;
    });

    type T = typeof dynamicRequire;
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
