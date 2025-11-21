import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { Sica } from "../types";
import { Env } from "./env";
import { Use } from "./use";
import { Message } from "../boria/message";
import { Provide } from "./provide";

describe("Action", () => {
  it("works with arrow functions", async () => {
    const succeed = Action("Succeed", () => ({ success: true }));

    type T = typeof succeed;

    type succeed = Expect<
      Equal<
        Sica.NullaryAction<
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

  it("works with array type", async () => {
    const succeed = Action(["io", "Succeed"], () => ({
      success: true,
    }));

    type T = typeof succeed;

    type succeed = Expect<
      Equal<
        Sica.NullaryAction<
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
    const sayHello = Action("Say hello", (params: { language: string }) => {
      return `Hello in ${params.language}`;
    });

    type T = typeof sayHello;

    type sayHello = Expect<
      Equal<
        Sica.Action<
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
    const sayHello = Action("Say hello", (params: { language: string }) => {
      return `Hello in ${params.language}`;
    });

    const scope = [Provide("env", process.env)] as const;

    type T = typeof sayHello;

    type sayHello = Expect<
      Equal<
        Sica.Action<
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
    const streamNumbers = Action("Stream", async function* () {
      yield Message.User([
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
    const dynamicEnv = Action("Stream", async function* () {
      const env = yield* Env({ API_KEY: "string" });

      return Boolean(env);
    });

    type T = typeof dynamicEnv;

    type dynamicEnv = Expect<
      Equal<
        Sica.NullaryAction<
          () => AsyncGenerator<
            never,
            boolean,
            Sica.Use<
              Sica.Struct<
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
    const dynamicRequire = Action("Stream", async function* () {
      const io = yield* Use("abort-signal").as<AbortSignal>();

      return io.aborted;
    });

    type T = typeof dynamicRequire;

    type dynamicRequire = Expect<
      Equal<
        Sica.NullaryAction<
          () => AsyncGenerator<
            never,
            boolean,
            Sica.Use<Sica.Struct<AbortSignal, ["abort-signal"]>>
          >,
          ["action", "Stream"]
        >,
        T
      >
    >;
  });

  it("works with require env", async () => {
    type IO = Sica.Action<
      (params: { in: string } | { out: string }) => boolean,
      ["io"]
    >;

    const dynamicRequire = Action("Stream", async function* () {
      const io = yield* Use<IO>("io");

      yield* io({ in: "What is your favorite color?" });
    });

    type T = typeof dynamicRequire;

    type dynamicRequire = Expect<
      Equal<
        Sica.NullaryAction<
          () => AsyncGenerator<never, void, Sica.Use<IO>>,
          ["action", "Stream"]
        >,
        T
      >
    >;
  });

  it("works with libs", async () => {
    type Ask = Sica.Action<
      (params: { question: string; type: "confim" | "select" }) => boolean,
      ["ask"]
    >;

    const askActionAction = Action("Stream", async function* () {
      const ask = yield* Use<Ask>("ask");

      const response = yield* ask({
        question: "Do you want to procceed?",
        type: "confim",
      });

      return response;
    });

    type T = typeof askActionAction;

    type askActionAction = Expect<
      Equal<
        Sica.NullaryAction<
          () => AsyncGenerator<never, boolean, Sica.Use<Ask>>,
          ["action", "Stream"]
        >,
        T
      >
    >;
  });
});

type Action<Scope> = {
  readonly run: (scope: Scope) => string;
};

type Apply<F extends Sica.GenericHandler, scope> = (F & {
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
  class extends Sica.GenericHandler {
    handler = fn;
    declare bind: typeof this.handler<
      [Sica.Generic<this, "model">, Sica.Generic<this, "trip">]
    >;
  };

const acls = makeScoped(handler);

const a = new acls();

// const l = a.handler({ model: "asdasd", lorem: 2, trip: 3 });

type P = Apply<typeof a, { model: "gpt-5" | "grok"; trip: string }>;

const oo: P = {} as never;

const ooo = oo();

const ddd = ooo({ model: "gpt-5", trip: "SAdads" });
