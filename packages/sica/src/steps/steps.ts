import { Boria } from "../boria";
import { PrettyScope } from "../helpers";
import { Sica } from "../types";

type BuildTuple<L extends number, T extends any[] = []> = T["length"] extends L
  ? T
  : BuildTuple<L, [...T, any]>;

type Add<A extends number, B extends number> = [
  ...BuildTuple<A>,
  ...BuildTuple<B>,
]["length"];

type Subtract<A extends number, B extends number> =
  BuildTuple<A> extends [...infer Rest, ...BuildTuple<B>]
    ? Rest["length"]
    : never;

type IndentStep<T, N extends number> =
  T extends Sica.StepOption<"loop" | "if", null>
    ? Add<N, 1>
    : T extends Sica.StepOption<"end", null>
      ? Subtract<N, 1>
      : N;

type Indent<Arr extends any[], N extends number = 0> = Arr extends [
  infer Head,
  ...infer Tail,
]
  ? Indent<Tail, Extract<IndentStep<Head, N>, number>>
  : N;

type ResultA = Indent<
  [Sica.StepOption<"if", null>, Sica.StepOption<"end", null>],
  0
>;

type Return = Sica.NullaryAction<
  () => {
    success: boolean;
  }
>;

type AnyStep<Scope> =
  | { name: string; run: (scope: PrettyScope<Scope>) => any }
  | {
      name: string;
      type: string[];
      middleware: (scope: PrettyScope<Scope>, next: any) => any;
    }
  | ((
      scope: PrettyScope<Scope>
    ) => any | Sica.StepOption<any, null> | Boria.AnyMessage)
  | Sica.StepOption<any, null>
  | Boria.AnyMessage;

type InferStepRecord<Step> = Step extends {
  name: infer Name;
  run: infer Fn;
}
  ? Name extends string
    ? Fn extends (args: any) => any
      ? Record<Name, ReturnType<Fn>>
      : {}
    : {}
  : {};

export interface Steps<Scope extends Record<any, any>> {
  <const S0 extends AnyStep<Scope>, S0R>(
    ...trumpets: [step: S0 & { run: S0R }]
  ): Return;
  <
    const S0 extends AnyStep<Scope>,
    const S1 extends AnyStep<Scope & InferStepRecord<S0>>,
  >(
    ...trumpets: [step: S0, step: S1]
  ): Return;
  <
    const S0 extends AnyStep<Scope>,
    const S1 extends AnyStep<Scope & InferStepRecord<S0>>,
    const S2 extends AnyStep<Scope & InferStepRecord<S0> & InferStepRecord<S1>>,
  >(
    ...trumpets: [step: S0, step: S1, step: S2]
  ): Return;
  <
    const S0 extends AnyStep<Scope>,
    const S1 extends AnyStep<Scope & InferStepRecord<S0>>,
    const S2 extends AnyStep<Scope & InferStepRecord<S0> & InferStepRecord<S1>>,
    const S3 extends AnyStep<
      Scope & InferStepRecord<S0> & InferStepRecord<S1> & InferStepRecord<S2>
    >,
  >(
    ...trumpets: [step: S0, step: S1, step: S2, step: S3]
  ): Return;
  <
    const S0 extends AnyStep<Scope>,
    const S1 extends AnyStep<Scope & InferStepRecord<S0>>,
    const S2 extends AnyStep<Scope & InferStepRecord<S1>>,
    const S3 extends AnyStep<
      Scope & InferStepRecord<S0> & InferStepRecord<S1> & InferStepRecord<S2>
    >,
    const S4 extends AnyStep<
      Scope &
        InferStepRecord<S0> &
        InferStepRecord<S1> &
        InferStepRecord<S2> &
        InferStepRecord<S3>
    >,
  >(
    ...trumpets: [step: S0, step: S1, step: S2, step: S3, step: S4]
  ): Return;
}

export const Steps: Steps<{}> = () => {
  return {} as never;
};

export const Step = <const K, const P>(key: K, params: P) =>
  [key, () => params] as const;

export const Parallel = (name?: string): Sica.StepOption<"parallel", null> => ({
  stepOptionType: "parallel",
  group: null,
  params: { name },
});

export const Return = (): Sica.StepOption<"return", null> => ({
  stepOptionType: "return",
  group: null,
});
