import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { Sica } from "../types";
import { Hkt } from "arktype";

describe("Action", () => {
  it("works with arrow functions", async () => {
    const succeed = Action("Succeed", () => ({ success: true }));

    type T = typeof succeed;

    type succeed = Expect<
      Equal<
        Sica.Runnable<
          "Succeed",
          () => {
            success: boolean;
          }
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
        Sica.Action<"Say hello", (params: { language: string }) => string>,
        T
      >
    >;

    const result = await sayHello({ language: "Spanish" });

    expect(result).toEqual("Hello in Spanish");
  });

  it("works with generators", async () => {
    const streamNumbers = Action("Stream", async function* () {
      yield 1;
      yield 2;
      yield 3;
    });

    type T = typeof streamNumbers;

    for await (const n of streamNumbers()) {
      console.log(n);
    }
  });

  it("works with schema", async () => {
    const schemaInput = Action("schema-input")
      .input({ name: "string" })

      .handler(({ name }) => name);

    const result = await schemaInput({ name: "Spanish" });
  });

  it("works with scope", async () => {
    const sayHello = Action(
      "Say hello",
      <Scope extends Record<any, any>>(_: Scope) =>
        (params: { model: Scope["model"] }) => {
          return `Hello in ${params.model}`;
        }
    );

    const sayHi = Action(
      "Say hello",
      <Scope extends Record<any, any>>(_: Scope) =>
        (params: { trip: Scope["trip"] }) => {
          return `Hello in ${params.trip}`;
        }
    );

    type T = typeof sayHello;

    type sayHello = Expect<
      Equal<
        Sica.Action<
          "Say hello",
          <Scope extends Record<any, any>>(
            scope: Scope
          ) => (params: { model: Scope["model"] }) => string
        >,
        T
      >
    >;

    sayHello({ model: "asdad" });

    const actions = [sayHi, sayHello];

    const items = actions.map((item) => item[Sica.RUN]({ model: 3 }));
  });
});

type Action<Scope> = {
  readonly run: (scope: Scope) => string;
};

abstract class GenericHandler {
  readonly scope?: unknown;
  handler?: unknown;
  bind?: (...x: never[]) => unknown;
}

type Generic<T extends Record<any, any>, Key> = T extends {
  scope: Record<any, any>;
}
  ? T["scope"][Key]
  : T["scope"];

type Apply<F extends GenericHandler, scope> = (F & {
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
  class extends GenericHandler {
    handler = fn;
    declare bind: typeof this.handler<
      [Generic<this, "model">, Generic<this, "trip">]
    >;
  };

const acls = makeScoped(handler);

const a = new acls();

// const l = a.handler({ model: "asdasd", lorem: 2, trip: 3 });

type P = Apply<typeof a, { model: "gpt-5" | "grok"; trip: string }>;

const oo: P = {} as never;

const ooo = oo()

const ddd = ooo({ model: "gpt-5", trip: "SAdads" });
