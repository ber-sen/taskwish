import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { Taskwish } from "../types";

describe("Action", () => {
  it("works with async arrow functions", async () => {
    const { healthz } = Action("Healthz").handler(function () {
      return { status: "ok" };
    });

    type T = typeof healthz;

    type healthz = Expect<
      Equal<
        Taskwish.Action<
          "Healthz",
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

  it("works with with input", async () => {
    const { hello } = Action("Hello")
      .on({ name: "string" })

      .handler(function () {
        return `Hello ${this.input.name}`;
      });

    type T = typeof hello;

    type hello = Expect<
      Equal<
        Taskwish.Action<
          "Hello",
          (input: { name: string }) => Promise<string>,
          null
        >,
        T
      >
    >;

    const result = await hello({ name: "World" });

    expect(result).toEqual({ success: true });
  });

  it("works with generics", async () => {
    const { genericAction } = Action("generic action")
      .signature<<const T>(lorem: T) => Promise<T>>()

      .handler(async function () {
        const [lorem] = this.input;

        const a = this(AbortSignal);

        return lorem;
      });

    type T = typeof genericAction;

    type result = Expect<
      Equal<
        Taskwish.Action<
          "generic action",
          <const T>(lorem: T) => Promise<T>,
          null
        >,
        T
      >
    >;

    const result = await genericAction("gpt");

    expect(result).toEqual({ success: true });
  });

  it("works with hkt", async () => {
    interface MyHandler extends Taskwish.Handler {
      run<const T extends this["ctx"]["model"]>(lorem: T): Promise<number>;
    }

    const { myHandler } = Action("my handler")
      .signature<MyHandler>()

      .handler(async function () {
        const [lorem] = this.input;

        return lorem.length;
      });

    type T = typeof myHandler;

    type result = Expect<
      Equal<
        Taskwish.Action<
          "my handler",
          <const T extends "gpt">(lorem: T) => Promise<number>,
          Record<"handler", MyHandler>
        >,
        T
      >
    >;

    const result = await myHandler("gpt");

    expect(result).toEqual({ success: true });
  });
});
