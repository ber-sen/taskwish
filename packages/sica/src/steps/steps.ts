import { PrettyScope, ToCamelCase } from "../helpers";
import { Sica } from "../types";

type BuildTuple<L extends number, T extends any[] = []> = T["length"] extends L
  ? T
  : BuildTuple<L, [...T, any]>;

type Add<A extends number, B extends number> = [
  ...BuildTuple<A>,
  ...BuildTuple<B>
]["length"];

type Subtract<A extends number, B extends number> = BuildTuple<A> extends [
  ...infer Rest,
  ...BuildTuple<B>
]
  ? Rest["length"]
  : never;

type IndentStep<T, N extends number> = T extends Sica.StepOption<
  "loop" | "if",
  null
>
  ? Add<N, 1>
  : T extends Sica.StepOption<"end", null>
  ? Subtract<N, 1>
  : N;

type Indent<Arr extends any[], N extends number = 0> = Arr extends [
  infer Head,
  ...infer Tail
]
  ? Indent<Tail, Extract<IndentStep<Head, N>, number>>
  : N;

type ResultA = Indent<
  [Sica.StepOption<"if", null>, Sica.StepOption<"end", null>],
  0
>;

type Props<T> = {
  [K in keyof T as ToCamelCase<Extract<K, string>>]: K extends "scope"
    ? PrettyScope<T[K]>
    : T[K];
} & {};

type Return = Sica.Runnable<
  never,
  {
    success: boolean;
  },
  unknown
>;

type Step0<Scope, S0, S0R> =
  | [name: S0, handler: (props: Props<Scope>) => S0R]
  | ((props: Props<Scope>) => S0R | Sica.StepOption<any, null>)
  | Sica.StepOption<any, null>;

type Step1<Scope, S0, S0R, S1, S1R> =
  | [
      name: S1,
      handler: (
        props: Props<Scope & (S0 extends string ? Record<S0, S0R> : {})>
      ) => S1R
    ]
  | ((
      props: Props<Scope & (S0 extends string ? Record<S0, S0R> : {})>
    ) => S1R | Sica.StepOption<any, null>)
  | Sica.StepOption<any, null>;

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
    ) => S2R | Sica.StepOption<any, null>)
  | Sica.StepOption<any, null>;

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
    ) => S3R | Sica.StepOption<any, null>)
  | Sica.StepOption<any, null>;

type Step4<Scope, S0, S0R, S1, S1R, S2, S2R, S3, S3R, S4, S4R> =
  | [
      name: S4,
      handler: (
        props: Props<
          Scope &
            (S0 extends string ? Record<S0, S0R> : {}) &
            (S1 extends string ? Record<S1, S1R> : {}) &
            (S2 extends string ? Record<S2, S2R> : {}) &
            (S3 extends string ? Record<S3, S3R> : {})
        >
      ) => S4R
    ]
  | ((
      props: Props<
        Scope &
          (S0 extends string ? Record<S0, S0R> : {}) &
          (S1 extends string ? Record<S1, S1R> : {}) &
          (S2 extends string ? Record<S2, S2R> : {}) &
          (S3 extends string ? Record<S3, S3R> : {})
      >
    ) => S4R | Sica.StepOption<any, null>)
  | Sica.StepOption<any, null>;

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
  <
    const S0,
    const S0R,
    const S1,
    const S1R,
    const S2,
    const S2R,
    const S3,
    const S3R,
    const S4,
    const S4R
  >(
    ...trumpets: [
      step: Step0<Scope, S0, S0R>,
      step: Step1<Scope, S0, S0R, S1, S1R>,
      step: Step2<Scope, S0, S0R, S1, S1R, S2, S2R>,
      step: Step3<Scope, S0, S0R, S1, S1R, S2, S2R, S3, S3R>,
      step: Step4<Scope, S0, S0R, S1, S1R, S2, S2R, S3, S3R, S4, S4R>
    ]
  ): Return;
}

export const Steps: Steps<{}> = () => {
  return {} as never
}

export const Step = <const K, const P>(key: K, params: P) =>
  [key, () => params] as const;

export const Parallel = (
  name?: string
): Sica.StepOption<"parallel", null> => ({
  stepOptionType: "parallel",
  group: null,
  params: { name },
});

export const Return = (): Sica.StepOption<"return", null> => ({
  stepOptionType: "return",
  group: null,
});
