import { Last } from "./steps";

export interface SubSteps {
  <Scope extends Record<any, any>, const Name, A>(
    name: Name,
    steps: (
      Step: (
        name: "launchApp" | "scrollUntilVisible" | "tapOn",
        options: any
      ) => [step: { step: (input: Scope) => A }]
    ) => void
  ): {
    step: (
      scope: Scope
    ) => Name extends string
      ? Record<Name, A> &
          Record<typeof Last, A> &
          Omit<Scope, typeof Last>
      : Scope;
  };
  <Scope extends Record<any, any>, const Name, A, B>(
    name: Name,
    steps: (
      Step: (
        name: "launchApp" | "scrollUntilVisible" | "tapOn",
        options: any
      ) => [
        step1: { step: (input: Scope) => A },
        step2: { step: (input: A) => B },
      ]
    ) => void
  ): {
    step: (
      scope: Scope
    ) => Name extends string
      ? Record<Name, boolean> &
          Record<typeof Last, boolean> &
          Omit<Scope, typeof Last>
      : Scope;
  };
}
