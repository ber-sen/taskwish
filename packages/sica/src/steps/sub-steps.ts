import { Last, StepsReturn } from "./steps";

export interface SubSteps {
  Step<Scope, StepName extends "launchApp" | "scrollUntilVisible" | "tapOn">(
    name: StepName,
    options: any
  ): {
    step: (
      scope: Scope
    ) => StepName extends string
      ? Record<StepName, boolean> &
          Record<typeof Last, boolean> &
          Omit<Scope, typeof Last>
      : Scope;
  };
  Steps<Scope extends Record<any, any>, A>(step: {
    step: (input: Scope) => A;
  }): {
    step: (input: Scope) => A;
  };
  Steps<Scope extends Record<any, any>, A, B>(
    step1: {
      step: (input: Scope) => A;
    },
    step2: {
      step: (input: A) => B;
    }
  ): {
    step: (input: Scope) => B;
  };
  Steps<Scope extends Record<any, any>, A, B, C>(
    step1: {
      step: (input: Scope) => A;
    },
    step2: {
      step: (input: A) => B;
    },
    step3: {
      step: (input: B) => C;
    }
  ): {
    step: (input: Scope) => C;
  };
}
