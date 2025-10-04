import { PrettyScope, ToCamelCase } from "./helper-types";

type Props<T> = {
  [K in keyof T as ToCamelCase<Extract<K, string>>]: K extends "scope"
    ? PrettyScope<T[K]>
    : T[K];
} & {};

export interface Steps<Scope extends Record<any, any> = {}> {
  <const S0, const S0R>(
    ...trumpets: [
      step:
        | [name: S0, handler: ((props: Props<Scope>) => S0R) | S0R]
        | ((
            props: Props<Scope>
          ) => Exclude<S0R, StepOption<any, string>> | StepOption<any, null>)
        | Exclude<S0R, StepOption<any, string>>
        | StepOption<any, null>
    ]
  ): S0;
  <const S0, const S0R, const S1, const S1R>(
    ...trumpets: [
      step:
        | [name: S0, handler: ((props: Props<Scope>) => S0R) | S0R]
        | ((props: Props<Scope>) => Exclude<S0R, StepOption<any, string>>)
        | Exclude<S0R, StepOption<any, string>>
        | StepOption<any, null>,
      step:
        | [
            name: S0,
            (
              | ((
                  props: Props<
                    Scope &
                      Record<
                        "scope",
                        Record<S0 extends string ? S0 : "step-0", S0R>
                      >
                  >
                ) => S1R)
              | S1R
            )
          ]
        | ((
            props: Props<
              Scope &
                Record<"scope", Record<S0 extends string ? S0 : "step-0", S0R>>
            >
          ) => S1R | StepOption<any, null>)
        | S1R
        | StepOption<any, null>
        | StepOption<any, null>
    ]
  ): S0 | S1;
  <const S0, const S0R, const S1, const S1R, const S2, const S2R>(
    ...trumpets: [
      step:
        | [name: S0, handler: ((props: Props<Scope>) => S0R) | S0R]
        | ((props: Props<Scope>) => Exclude<S0R, StepOption<any, string>>)
        | Exclude<S0R, StepOption<any, string>>
        | StepOption<any, null>,
      step:
        | [
            name: S0,
            (
              | ((
                  props: Props<
                    Scope &
                      Record<
                        "scope",
                        Record<S0 extends string ? S0 : "step-0", S0R>
                      >
                  >
                ) => S1R)
            )
          ]
        | ((
            props: Props<
              Scope &
                Record<"scope", Record<S0 extends string ? S0 : "step-0", S0R>>
            >
          ) => StepOption<any, null>)
    
        | StepOption<any, null>
        | StepOption<any, null>,
      step:
        | [
            name: S0,
            (
              | ((
                  props: Props<
                    Scope &
                      Record<
                        "scope",
                        Record<S0 extends string ? S0 : "step-0", S0R>
                      >
                  >
                ) => S1R)
              | S1R
            )
          ]
        | ((
            props: Props<
              Scope &
                Record<"scope", Record<S0 extends string ? S0 : "step-0", S0R>>
            >
          ) => S1R | StepOption<any, null>)
        | S1R
        | StepOption<any, null>
        | StepOption<any, null>
    ]
  ): S0 | S1;
}

export const Steps = (() => {
  return {} as any;
}) as Steps;

export interface StepOption<T extends string, G extends null | string> {
  stepOptionType: T;
  group: G;
  params?: object;
}

export const Loop = (
  ...params: Array<StepOption<any, "loop">>
): StepOption<"loop", null> => ({
  stepOptionType: "loop",
  group: null,
  params,
});

export const Range = (
  from: number,
  to: number
): StepOption<"range", "loop"> => ({
  stepOptionType: "range",
  group: "loop",
  params: {
    from,
    to,
  },
});

export const End = (
  params: (...params: any) => StepOption<any, null>
): StepOption<"end", null> => ({
  stepOptionType: "end",
  group: null,
  params,
});
