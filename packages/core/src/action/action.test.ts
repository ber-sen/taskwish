import { expect, test } from "bun:test";
import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { TW } from "../core";
import { Step } from "../steps";

test("works with async arrow functions", async () => {
  const { healthz } = Action("healthz").run(function () {
    return { status: "ok" };
  });

  type T = typeof healthz;

  type healthz = Expect<
    Equal<
      TW.Action<
        "healthz",
        () => Promise<{
          status: string;
        }>,
        null
      >,
      T
    >
  >;

  const result = await healthz();

  expect(result).toEqual({ status: "ok" });
});

test("works with with input", async () => {
  const { hello } = Action("hello")
    .input({ name: "string" })

    .run(function () {
      return `Hello ${this.input.name}`;
    });

  type T = typeof hello;

  type hello = Expect<
    Equal<
      TW.Action<"hello", (input: { name: string }) => Promise<string>, null>,
      T
    >
  >;

  const result = await hello({ name: "World" });

  expect(result).toEqual("World");
});

test("works with with steps", async () => {
  const { hello } = Action("hello")
    .input({ name: "string" })

    .run(
      Step("First step", function () {
        return this.input.name.length;
      }),
      Step("Second step", function () {
        return this.firstStep > 0;
      }),
    );

  type T = typeof hello;

  type hello = Expect<
    Equal<
      TW.Action<"hello", (input: { name: string }) => Promise<boolean>, null>,
      T
    >
  >;

  const result = await hello({ name: "World" });

  expect(result).toEqual({ success: true });
});

test("works with ts type", async () => {
  const { tsAction } = Action("tsAction")
    .input<{ name: string }>()

    .run(async function () {
      return `Hello ${this.input.name}`;
    });

  type T = typeof tsAction;

  type result = Expect<
    Equal<
      TW.Action<
        "tsAction",
        (input: { name: string }) => Promise<Promise<string>>,
        null
      >,
      T
    >
  >;

  const result = await tsAction({ name: "Test" });

  expect(result).toEqual(`Hello Test`);
});

test("works with generics", async () => {
  const { genericAction } = Action("genericAction")
    .input<<const T>(lorem: T) => Promise<T>>()

    .run(async function () {
      const [lorem] = this.input;

      const a = this.get(AbortSignal);

      return lorem;
    });

  type T = typeof genericAction;

  type result = Expect<
    Equal<
      TW.Action<"genericAction", <const T>(lorem: T) => Promise<T>, null>,
      T
    >
  >;

  const result = await genericAction("gpt");

  expect(result).toEqual({ success: true });
});

test("works with hkt", async () => {
  interface MyHandler extends TW.Handler {
    run<const T extends this["ctx"]["model"]>(lorem: T): Promise<number>;
  }

  const { myHandler } = Action("myHandler")
    .input<MyHandler>()

    .run(async function () {
      const [lorem] = this.input;

      return lorem.length;
    });

  type T = typeof myHandler;

  type result = Expect<
    Equal<
      TW.Action<
        "myHandler",
        <const T extends "gpt5">(lorem: T) => Promise<number>,
        Record<"handler", MyHandler>
      >,
      T
    >
  >;

  const result = await myHandler("gpt5");

  expect(result).toEqual({ success: true });
});
