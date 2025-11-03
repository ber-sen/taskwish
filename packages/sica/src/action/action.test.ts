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

    sayHello({ model: "asda" });

    const result = sayHello[Sica.RUN]({ model: 3 });
  });
});
