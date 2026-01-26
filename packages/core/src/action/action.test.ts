import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { Taskwish } from "../types";

describe("Action", () => {
  it("works with async arrow functions", async () => {
    const { succeed } = Action("Succeed").handler(() => ({
      success: true,
    }));

    type T = typeof succeed;

    type succeed = Expect<
      Equal<
        Taskwish.Action<
          "Succeed",
          () => Promise<{
            success: boolean;
          }>,
          null
        >,
        T
      >
    >;

    const result = await succeed();

    expect(result).toEqual({ success: true });
  });

  it("works with with input", async () => {
    const { hello } = Action("hello")
      .on({ name: "string" })

      .handler(function () {
        return `Hello ${this.input.name}`;
      });

    type T = typeof hello;

    type succeed = Expect<
      Equal<
        Taskwish.Action<
          "hello",
          (input: { name: string }) => Promise<string>,
          null
        >,
        T
      >
    >;

    const result = await hello({ name: "World" });

    expect(result).toEqual({ success: true });
  });

  it("works with types", async () => {
    const { typeAction } = Action("type action")
      .signature<(lorem: string) => Promise<boolean>>()

      .handler(async function (lorem) {
        const a = this(AbortSignal);
        return true;
      });

    type T = typeof typeAction;

    type result = Expect<
      Equal<
        Taskwish.Action<
          "type action",
          (lorem: string) => Promise<boolean>,
          null
        >,
        T
      >
    >;

    const result = await typeAction("gpt");

    expect(result).toEqual({ success: true });
  });

  it("works with this", async () => {
    const { scopeAction } = Action("scope action")
      .signature<<const T>(lorem: T) => Promise<T>>()

      .handler(async function (lorem) {
        const a = this(AbortSignal);

        return lorem;
      });

    type T = typeof scopeAction;

    type result = Expect<
      Equal<
        Taskwish.Action<
          "scope action",
          <const T>(lorem: T) => Promise<T>,
          null
        >,
        T
      >
    >;

    const result = await scopeAction("gpt");

    expect(result).toEqual({ success: true });
  });

  it("works with ctx", async () => {
    interface MyHandler extends Taskwish.Handler {
      run<const T extends this["ctx"]["model"]>(lorem: T): Promise<number>;
    }

    const { myHandler } = Action("my handler")
      .signature<MyHandler>()

      .handler(async function (lorem) {
        return 2;
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
