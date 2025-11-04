import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { Sica } from "../types";

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

interface Scoped<Items extends Record<string, Sica.Action<any, any>>> {
  actions: {
    [K in keyof Items]: Items[K][typeof Sica.RUN];
  };
}

type Action<Scope> = {
  readonly run: (scope: Scope) => string;
};

abstract class HKT {
  readonly scope?: unknown;
  handler?: (...x: never[]) => unknown;
}

type Assume<T, U> = T extends U ? T : U;

type Apply<F extends HKT, scope> = ReturnType<
  NonNullable<
    (F & {
      readonly scope: scope;
    })["handler"]
  >
>;

interface DoubleString extends HKT {
  handler: (x: Assume<this["scope"], { name: unknown }>["name"]) => {
    name: typeof x;
  };
}

// "hi!hi!"
type Result = Apply<DoubleString, { name: 4 }>;
