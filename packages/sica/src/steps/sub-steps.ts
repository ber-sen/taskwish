import { Last, StepsReturn } from "./steps";

export interface SubSteps {
  <Scope extends Record<any, any>, const Name, A>(
    name: Name,
    steps: (
      Step: (
        name: "launchApp" | "scrollUntilVisible" | "tapOn",
        options: any
      ) => [step: { step: (input: Scope) => A } | ((this: Scope) => A)]
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

