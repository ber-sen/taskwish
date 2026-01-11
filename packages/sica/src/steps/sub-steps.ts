import { Last, StepsReturn } from "./steps";

export interface SubSteps {
  <Scope extends Record<any, any>, const Name, A>(
    name: Name,
    steps: (
      Step: <StepName extends "launchApp" | "scrollUntilVisible" | "tapOn">(
        name: StepName,
        options: any
      ) => {
        step: (
          scope: Scope
        ) => StepName extends string
          ? Record<StepName, boolean> &
              Record<typeof Last, boolean> &
              Omit<Scope, typeof Last>
          : Scope;
      }
    ) => [step: { step: (input: Scope) => A }]
  ): {
    step: (
      scope: Scope
    ) => StepsReturn<
      Name extends string
        ? Record<Name, A> & Record<typeof Last, A> & Omit<Scope, typeof Last>
        : Scope
    >;
  };
}
