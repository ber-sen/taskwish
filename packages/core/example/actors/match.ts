import { Actor, Step, TW } from "../../src";

export interface OptionSubSteps {
  <Ctx extends Record<any, any>, Options, A>(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step: {
      [TW.Step]: (input: Ctx) => A;
    },
  ): {
    [TW.Step]: (input: Ctx) => A;
  };
  <Ctx extends Record<any, any>, Options, A, B>(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step1: {
      [TW.Step]: (input: Ctx) => A;
    },
    step2: {
      [TW.Step]: (input: A) => B;
    },
  ): {
    [TW.Step]: (input: Ctx) => B;
  };
  <Ctx extends Record<any, any>, Options, A, B, C>(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step1: {
      [TW.Step]: (input: Ctx) => A;
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

const Match: (<const Ctx extends Record<any, any>>(
  fn: (scope: Ctx["scope"]) => any,
) => {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    [TW.Step]: Ctx["step"];
    scope: Ctx["scope"];
    last: void;
    plugins: Ctx["plugins"];
  };
}) & { With: OptionSubSteps } = {} as never

const { MyActor } = Actor("MyActor");

export const { match } = MyActor()
  .on("Command", "match")

  .input({ type: "string" })

  .run(
    Match(($) => $.input),

    Match.With(
      { type: "error" },

      Step("Lorem", function () {
        return 3;
      }),
    ),

    Match.With(
      { type: "ok", data: { type: "text" } },

      Step("Lorem", function () {
        return this;
      }),
    ),
  );
