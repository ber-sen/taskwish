import { Taskwish } from "../types"

export interface OptionSubSteps {
  <Ctx extends Record<any, any>, Options, A>(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step: {
      [Taskwish.Step]: (input: Ctx) => A;
    },
  ): {
    [Taskwish.Step]: (input: Ctx) => A;
  };
  <Ctx extends Record<any, any>, Options, A, B>(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step1: {
      [Taskwish.Step]: (input: Ctx) => A;
    },
    step2: {
      [Taskwish.Step]: (input: A) => B;
    },
  ): {
    [Taskwish.Step]: (input: Ctx) => B;
  };
  <Ctx extends Record<any, any>, Options, A, B, C>(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step1: {
      [Taskwish.Step]: (input: Ctx) => A;
    },
    step2: {
      [Taskwish.Step]: (input: A) => B;
    },
    step3: {
      [Taskwish.Step]: (input: B) => C;
    },
  ): {
    [Taskwish.Step]: (input: Ctx) => C & Record<"options", Options>;
  };
}
