import { Expect, Equal } from "../helpers";
import { Action } from "./action";
import { Taskwish } from "../types";

describe("Action", () => {
  it("works with async arrow functions", async () => {
    const { succeed } = Action("Succeed").handler(async () => ({
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

  it("works with generic functions", async () => {
    const { generic } = Action("generic").handler(
      async <const T>(lorem: T) => ({
        lorem,
      }),
    );

    type T = typeof generic;

    type succeed = Expect<
      Equal<
        Taskwish.Action<
          "generic",
          <const T>(lorem: T) => Promise<{
            lorem: T;
          }>,
          null
        >,
        T
      >
    >;

    const result = await generic(3);

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

  // it("works with schema", async () => {
  //   const { succeed } = Action("Succeed").handler(
  //     (params: { name: string }) => ({
  //       success: true,
  //     }),
  //   );

  //   type T = typeof succeed;

  //   type succeed = Expect<
  //     Equal<
  //       Taskwish.Action<
  //         "Succeed",
  //         (params: { name: string }) => {
  //           success: boolean;
  //         },
  //         null
  //       >,
  //       T
  //     >
  //   >;

  //   const result = await succeed({ name: "asda" });

  //   expect(result).toEqual({ success: true });
  // });

  // it("works with params", async () => {
  //   const { sayHello } = Action("Say hello").handler(
  //     (params: { language: string }) => {
  //       return `Hello in ${params.language}`;
  //     },
  //   );

  //   type T = typeof sayHello;

  //   type sayHello = Expect<
  //     Equal<
  //       Taskwish.Action<
  //         "Say hello",
  //         (params: { language: string }) => string,
  //         null
  //       >,
  //       T
  //     >
  //   >;

  //   const result = await sayHello({ language: "Spanish" });

  //   expect(result).toEqual("Hello in Spanish");
  // });

  // it("works with generators", async () => {
  //   const { myAction } = Action("my action").handler(async function* () {
  //     yield Message([
  //       { type: "text", text: "asd" },
  //       { type: "text", text: "asdasd" },
  //     ]);
  //     yield 2;
  //     yield 3;
  //   });

  //   type T = typeof myAction;

  //   for await (const n of myAction()) {
  //     console.log(n);
  //   }
  // });

  // it("works with dynamic env", async () => {
  //   const dynamicEnv = Action("Stream").handler(async function* () {
  //     const env = yield* Use(Env("API_KEY", "string"));

  //     return Boolean(env);
  //   });

  //   type T = typeof dynamicEnv;

  //   type dynamicEnv = Expect<
  //     Equal<
  //       Taskwish.NullaryAction<
  //         () => AsyncGenerator<
  //           never,
  //           boolean,
  //           Taskwish.Use<
  //             Taskwish.Struct<
  //               {
  //                 API_KEY: string;
  //               },
  //               ["env"]
  //             >
  //           >
  //         >,
  //         ["action", "Stream"]
  //       >,
  //       T
  //     >
  //   >;
  // });

  // it("works with AbortSignal", async () => {
  //   const { streamer } = Action("streamer").handler(async function* () {
  //     const signal = yield* this(AbortSignal);

  //     return signal.aborted;
  //   });

  //   type T = typeof streamer;

  //   type dynamicRequire = Expect<
  //     Equal<
  //       Taskwish.Action<
  //         "streamer",
  //         (
  //           this: Taskwish.Scope<{}>,
  //         ) => AsyncGenerator<unknown, boolean, AbortSignal>,
  //         null
  //       >,
  //       T
  //     >
  //   >;
  // });

  // it("works with generic", async () => {
  //   const dynamicRequire = Action("Stream").handler(async function* ({}: {
  //     lorem: string;
  //   }) {
  //     const io = yield* this(Taskwish.IO);

  //     io.messages;
  //   });

  //   type T = typeof dynamicRequire;
  // });
});

// type Action<Scope> = {
//   readonly run: (scope: Scope) => string;
// };

// type Apply<F extends Taskwish.GenericHandler, scope> = (F & {
//   readonly scope: scope;
// })["bind"];

// const handler =
//   <const S extends unknown[]>() =>
//   <const M extends S[0], const T extends S[1]>({
//     model,
//     trip,
//   }: {
//     model: M;
//     trip: T;
//   }) => ({
//     model,
//     trip,
//   });

// const makeScoped = (fn: typeof handler) =>
//   class extends Taskwish.GenericHandler {
//     handler = fn;
//     declare bind: typeof this.handler<
//       [Taskwish.Generic<this, "model">, Taskwish.Generic<this, "trip">]
//     >;
//   };

// const acls = makeScoped(handler);

// const a = new acls();

// // const l = a.handler({ model: "asdasd", lorem: 2, trip: 3 });

// type P = Apply<typeof a, { model: "gpt-5" | "grok"; trip: string }>;

// const oo: P = {} as never;

// const ooo = oo();

// const ddd = ooo({ model: "gpt-5", trip: "SAdads" });
