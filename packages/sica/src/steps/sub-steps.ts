import { Last, StepsReturn } from "./steps";

export interface SubSteps {
  Step<
    Ctx extends Record<any, any>,
    Name extends "launchApp" | "scrollUntilVisible" | "tapOn",
  >(
    name: Name,
    options: any
  ): {
    step: (ctx: Ctx) => Name extends string
      ? {
          scope: Ctx["scope"] &
            Record<
              Name,
              "if" extends keyof Ctx["scope"] ? boolean | undefined : boolean
            >;
          [Last]: boolean;
        }
      : Ctx;
  };
  Steps<Ctx extends Record<any, any>, A>(step: {
    step: (input: Ctx) => A;
  }): {
    step: (input: Ctx) => A;
  };
  Steps<Ctx extends Record<any, any>, A, B>(
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    }
  ): {
    step: (input: Ctx) => B;
  };
  Steps<Ctx extends Record<any, any>, A, B, C, Options>(
    options: (scope: Ctx["scope"]) => Options,
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    },
    step3: {
      step: (input: B) => C;
    }
  ): {
    step: (input: Ctx) => C & Record<"options", Options>;
  };
}
