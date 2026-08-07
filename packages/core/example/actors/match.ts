import { Actor, Step, TW } from "../../src";

export interface OptionSubSteps {
  <
    const Value extends Ctx["scope"]["$match"],
    Ctx extends Record<any, any>,
    Options,
    A,
  >(
    options: Value,
    step: {
      [TW.Step]: (
        input: Omit<Ctx, "scope"> &
          Record<
            "scope",
            Omit<Ctx["scope"], "matched"> & Record<"matched", Value>
          >,
      ) => A;
    },
  ): {
    [TW.Step]: (input: Ctx) => A;
  };
  <
    const Value extends Ctx["scope"]["$match"],
    Ctx extends Record<any, any>,
    Options,
    A,
    B,
  >(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step1: {
      [TW.Step]: (
        input: Omit<Ctx, "scope"> &
          Record<
            "scope",
            Omit<Ctx["scope"], "matched"> & Record<"matched", Value>
          >,
      ) => A;
    },
    step2: {
      [TW.Step]: (input: A) => B;
    },
  ): {
    [TW.Step]: (input: Ctx) => B;
  };
  <
    Ctx extends Record<any, any>,
    Options,
    A,
    B,
    C,
    const Value extends Ctx["scope"]["$match"],
  >(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step1: {
      [TW.Step]: (
        input: Omit<Ctx, "scope"> &
          Record<
            "scope",
            Omit<Ctx["scope"], "matched"> & Record<"matched", Value>
          >,
      ) => A;
    },
    step2: {
      [TW.Step]: (input: A) => B;
    },
    step3: {
      [TW.Step]: (input: B) => C;
    },
  ): {
    [TW.Step]: (input: Ctx) => C & Record<"options", Options>;
  };
}

const Match: (<const Value, const Ctx extends Record<any, any>>(
  fn: (scope: Ctx["scope"]) => Value,
) => {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    step: Ctx["step"];
    scope: Ctx["scope"] & Record<"$match", Value>;
    last: Value;
    plugins: Ctx["plugins"];
  };
}) & { on: OptionSubSteps } = {} as never;

const { myActor } = Actor("MyActor");

export const { match } = myActor()
  .on("Command", "match")

  .input({ type: "string" })

  .run(
    Step("Lorem", function () {
      return 3;
    }),

    Match(($) => $.input),

    Match.on(
      { type: "sad" },

      Step("case1", function () {
        return this.matched;
      }),
    ),

    Match.on(
      { type: "asds" },

      Step("case2", function () {
        return this.matched;
      }),
    ),

    Step("end", function () {
      return this.case1
    }),
  );

  type A = { lorem: 3} | { ipsum: 2 } 

  type B = Extract<A, { ipsum: 2 }>

export const { MyActor } = myActor().service({ public: [match] });
