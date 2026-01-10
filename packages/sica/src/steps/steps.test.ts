import { Equal } from "drizzle-orm";
import { Sica } from "../types";
import { End } from "./end";
import { If } from "./if-else";
import { Loop } from "./loop";
import { Match } from "./match";
import { Steps } from "./steps";
import { Expect, Pretty } from "../helpers";
import { PartialOnUndefinedDeep } from "type-fest";
import { Input } from "./input";

describe("Steps", () => {
  it("works for two steps", async () => {
    const result = Steps(
      { name: "step 1", run: ($) => 3 },
      { name: "step 2", run: ($) => 3 }
    );

    expect(result).toEqual({ success: true });
  });

  it("should let steps inside a condition access the values before it", async () => {
    const result = Steps(
      { name: "step 1", run: () => 3 },

      If(2 > 1),

      { name: "asdasd 1", run: ($) => $.step1 },

      End(If)
    );

    expect(result).toEqual({ success: true });
  });

  it("should properly type steps inside condition with optional values", async () => {
    const a = {} as { lorem: number } | { ipsum: string };

    const result = Steps(
      If("lorem" in a && a),

      { name: "condition step", run: ($) => $.condition },

      End(If),

      { name: "end", run: ($) => $.conditionStep }
    );

    expect(result).toEqual({ success: true });
  });

  it("should return loop value as array", async () => {
    const result = Steps(
      Loop([1, 2, 3]),

      {
        name: "loop step",
        run: ($) => $.loop.value,
      },

      End(Loop),

      { name: "end", run: ($) => $.loopStep }
    );

    expect(result).toEqual({ success: true });
  });

  // it("should return loop value as array", async () => {
  //   const result = Steps(
  //     Loop(Range(0, 10)),

  //     {
  //       name: "loop step",
  //       run: ($) => $.loop.value,
  //     },

  //     End(Loop),

  //     { name: "end", run: ($) => $.loopStep }
  //   );

  //   expect(result).toEqual({ success: true });
  // });

  it("should work as action", async () => {
    const action = Steps(
      Input({ language: "string"}),

      { name: "end", run: ($) => $.input.language },
    );

    const result = action({ language: "Spanish" });

    expect(result).toEqual({ success: true });
  });

  it("should work with match", async () => {
    const action = Steps(
      Match(scope => scope.input),

      Match.with("me_message"),

      { name: "end", run: ($) => $.input.language },

      Match.with("asd"),

      { name: "end", run: ($) => $.input.language },

      End(Match)
    );

    const result = action({ language: "Spanish" });

    expect(result).toEqual({ success: true });
  });


  it("should work with pipe", async () => {
    const action = Steps(
      Pipe([1,2,3]),

      
      Pipe.mapToObj((x) => [String(x), x * 2])

      End(Pipe)
    );

    const result = action({ language: "Spanish" });

    expect(result).toEqual({ success: true });
  });

  it("should work with match", async () => {
    const Step = <const Name extends string, const R>(
      name: Name,
      data: R
    ): Sica.Step<Name, R> => ({}) as never;

    const steps = async function* () {
      yield Step("1", 3);
      yield Step("2", "sadasd");
      yield Step("3", true);
      yield Step("4", 3);
      yield Step("5", "sadasd");
      yield Step("6", true);
      yield Step("7", 3);
      yield Step("8", "sadasd");
      yield Step("9", true);
      yield Step("10", 3);
      yield Step("11", "sadasd");
      yield Step("12", true);
    };

    type T = ReturnType<typeof steps>;

    type succeed = Expect<
      Equal<
        AsyncGenerator<
          | Sica.Step<"1", 3, ["step"], null>
          | Sica.Step<"2", "sadasd", ["step"], null>
          | Sica.Step<"3", true, ["step"], null>
          | Sica.Step<"4", 3, ["step"], null>
          | Sica.Step<"5", "sadasd", ["step"], null>
          | Sica.Step<"6", true, ["step"], null>
          | Sica.Step<"7", 3, ["step"], null>
          | Sica.Step<"8", "sadasd", ["step"], null>
          | Sica.Step<"9", true, ["step"], null>
          | Sica.Step<"10", 3, ["step"], null>
          | Sica.Step<"11", "sadasd", ["step"], null>
          | Sica.Step<"12", true, ["step"], null>,
          void,
          unknown
        >,
        T
      >
    >;

    expect(result).toEqual({ success: true });
  });
});

type ApplyOptions<O extends readonly any[], R> = O extends [
  ...infer Rest,
  infer Last,
]
  ? Last extends ":loop"
    ? ApplyOptions<Rest, Array<R>>
    : Last extends ":if"
      ? ApplyOptions<Rest, R | undefined>
      : ApplyOptions<Rest, R>
  : R;

type AddOption<Option, T> = T extends string[]
  ? [Option, ...T]
  : T extends object
    ? { [K in keyof T]: AddOption<Option, T[K]> }
    : T;

type Append<Name extends string, Result, Next> = Result extends
  | ":loop"
  | ":parallel"
  | ":if"
  | ":end"
  ? AddOption<Result, Next>
  : Record<Name, { result: Result; operator: [] }> & Next;

type ExtractResults<T> = {
  [K in keyof T]: T[K] extends { operator: infer O; result: infer R }
    ? O extends any[]
      ? ApplyOptions<O, R>
      : never
    : never;
};

type OperatorCalculator<T> = {
  [K in keyof T]: T[K] extends { operator: infer O; result: infer R }
    ? O extends string[]
      ? { operator: RemovePrevWhenEnd<O>; result: R }
      : never
    : never;
};

type RemovePrevWhenEnd<
  T extends readonly string[],
  A extends string[] = [],
> = T extends [infer H extends string, ...infer Rest extends string[]]
  ? H extends ":end"
    ? RemovePrevWhenEnd<
        Rest,
        A extends [...infer X extends string[], any] ? X : []
      >
    : RemovePrevWhenEnd<Rest, [...A, H]>
  : A;

type FormatScope<Scope> = PartialOnUndefinedDeep<ExtractResults<Scope>>;

type Scope = OperatorCalculator<
  Append<
    "step1",
    ":loop",
    Append<
      "step2",
      4,
      Append<
        "step3",
        4,
        Append<
          "step4",
          ":loop",
          Append<
            "step5",
            3,
            Append<"step6", ":end", Append<"step7", true, {}>>
          >
        >
      >
    >
  >
>;

type Scope2 = OperatorCalculator<
  Append<
    typeof If(1 > 2)
    Append<
      { name: string; run: (scope: PrettyScope<Scope>) => any }, {}>
  >
>

type B = Pretty<FormatScope<Scope>>;

const b: B = {} as never;


