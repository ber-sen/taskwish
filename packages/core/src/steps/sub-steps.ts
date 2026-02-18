export interface OptionSubSteps {
  <Ctx extends Record<any, any>, Options, A>(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step: {
      step: (input: Ctx) => A;
    },
  ): {
    step: (input: Ctx) => A;
  };
  <Ctx extends Record<any, any>, Options, A, B>(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    },
  ): {
    step: (input: Ctx) => B;
  };
  <Ctx extends Record<any, any>, Options, A, B, C>(
    options: ((scope: Ctx["scope"]) => Options) | object,
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    },
    step3: {
      step: (input: B) => C;
    },
  ): {
    step: (input: Ctx) => C & Record<"options", Options>;
  };
}
