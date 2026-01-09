import { Boria } from "../boria";
import { PrettyScope } from "../helpers";
import { Sica } from "../types";

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
    ) => any | Sica.Flow<any, any, null> | Boria.Message<any, any>)
  | Sica.Flow<any, any, null>
  | Boria.Message<any, any>;

type InferStepRecord<Step> = Step extends {
  name: infer Name;
  run: infer Fn;
}
  ? Name extends string
    ? Fn extends (args: any) => any
      ? Record<Name, ReturnType<Fn>>
      : {}
    : {}
  : Step extends Sica.Flow<any, infer Scope, null>
    ? Scope
    : {};

export interface OldSteps<Scope extends Record<any, any>> {
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

// export const Parallel = (
//   name?: string
// ): Sica.Flow<["parallel"], null, any> => ({
//   [Sica.Type]: ["parallel"],
//   group: null,
// });

// export const Return = (): Sica.Flow<["return"], null, any> => ({
//   [Sica.Type]: ["return"],
//   group: null,
// });

export interface Steps<Scope extends Record<any, any>> {
  <A>(step: (input: Scope) => A): A;
  <A, B>(step1: (input: Scope) => A, step2: (input: A) => B): B;
  <A, B, C>(
    step1: (input: Scope) => A,
    step2: (input: A) => B,
    step3: (input: B) => C
  ): C;
}

export const Step =
  <const Name, const Result, Scope extends Record<any, any>>(
    name: Name,
    handler: (scope: PrettyScope<Scope>) => Result
  ) =>
  (
    scope: Scope
  ): Name extends string ? Scope & Record<Name, Result> : Scope => {
    return {} as any;
  };

const a = Steps(
  Step("lorem asd", () => 3),
  Step("asd", ($) => $.loremAsd),
  Step("asd lasd asd", ($) => $.asd)
);
