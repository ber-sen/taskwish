import { PrettyScope, ToCamelCase } from "./helper-types";
import { TaskWish } from "./types";

type Props<T> = {
  [K in keyof T as ToCamelCase<Extract<K, string>>]: K extends "scope"
    ? PrettyScope<T[K]>
    : T[K];
} & {};

type Return = TaskWish.Runnable<
  never,
  {
    success: boolean;
  },
  unknown
>;

type Step0<Scope, S0, S0R> =
  | [name: S0, handler: (props: Props<Scope>) => S0R]
  | ((props: Props<Scope>) => S0R | StepOption<any, null>)
  | StepOption<any, null>;

type Step1<Scope, S0, S0R, S1, S1R> =
  | [
      name: S1,
      handler: (
        props: Props<Scope & (S0 extends string ? Record<S0, S0R> : {})>
      ) => S1R
    ]
  | ((
      props: Props<Scope & (S0 extends string ? Record<S0, S0R> : {})>
    ) => S1R | StepOption<any, null>)
  | StepOption<any, null>;

type Step2<Scope, S0, S0R, S1, S1R, S2, S2R> =
  | [
      name: S2,
      handler: (
        props: Props<
          Scope &
            (S0 extends string ? Record<S0, S0R> : {}) &
            (S1 extends string ? Record<S1, S1R> : {})
        >
      ) => S2R
    ]
  | ((
      props: Props<
        Scope &
          (S0 extends string ? Record<S0, S0R> : {}) &
          (S1 extends string ? Record<S1, S1R> : {})
      >
    ) => S2R | StepOption<any, null>)
  | StepOption<any, null>;

type Step3<Scope, S0, S0R, S1, S1R, S2, S2R, S3, S3R> =
  | [
      name: S3,
      handler: (
        props: Props<
          Scope &
            (S0 extends string ? Record<S0, S0R> : {}) &
            (S1 extends string ? Record<S1, S1R> : {}) &
            (S2 extends string ? Record<S2, S2R> : {})
        >
      ) => S3R
    ]
  | ((
      props: Props<
        Scope &
          (S0 extends string ? Record<S0, S0R> : {}) &
          (S1 extends string ? Record<S1, S1R> : {}) &
          (S2 extends string ? Record<S2, S2R> : {})
      >
    ) => S3R | StepOption<any, null>)
  | StepOption<any, null>;

export interface Steps<Scope extends Record<any, any> = {}> {
  <const S0, const S0R>(...trumpets: [step: Step0<Scope, S0, S0R>]): Return;
  <const S0, const S0R, const S1, const S1R>(
    ...trumpets: [
      step: Step0<Scope, S0, S0R>,
      step: Step1<Scope, S0, S0R, S1, S1R>
    ]
  ): Return;
  <const S0, const S0R, const S1, const S1R, const S2, const S2R>(
    ...trumpets: [
      step: Step0<Scope, S0, S0R>,
      step: Step1<Scope, S0, S0R, S1, S1R>,
      step: Step2<Scope, S0, S0R, S1, S1R, S2, S2R>
    ]
  ): Return;
  <
    const S0,
    const S0R,
    const S1,
    const S1R,
    const S2,
    const S2R,
    const S3,
    const S3R
  >(
    ...trumpets: [
      step: Step0<Scope, S0, S0R>,
      step: Step1<Scope, S0, S0R, S1, S1R>,
      step: Step2<Scope, S0, S0R, S1, S1R, S2, S2R>,
      step: Step3<Scope, S0, S0R, S1, S1R, S2, S2R, S3, S3R>
    ]
  ): Return;
}

export const Steps = (() => {
  return {} as any;
}) as Steps;

export const Step = <const K, const P>(key: K, params: P) =>
  [key, () => params] as const;

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

export const If = (condition: boolean): StepOption<"condition-if", null> => ({
  stepOptionType: "condition-if",
  group: null,
  params: { condition },
});

export const ElseIf = (
  condition: boolean
): StepOption<"condition-else-if", null> => ({
  stepOptionType: "condition-else-if",
  group: null,
  params: { condition },
});

export const Else = (): StepOption<"condition-else-else", null> => ({
  stepOptionType: "condition-else-else",
  group: null,
});

export const Return = (): StepOption<"return", null> => ({
  stepOptionType: "return",
  group: null,
});