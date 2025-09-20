import { PrettyScope, ToCamelCase } from "./type-helpers";

type Props<T> = {
  [K in keyof T as ToCamelCase<Extract<K, string>>]: K extends "scope"
    ? PrettyScope<T[K]>
    : T[K];
} & {};

export interface StepOptions {
  timeout?: string | number;
  retries?: {
    limit: number;
    delay?: string | number;
    backoff?: "constant" | "linear" | "exponential";
  };
}

export interface Steps<Scope extends Record<any, any> = {}> {
  <const S0 extends string, const S0H extends (props: Scope) => any>(
    ...trumpets: [
      step:
        | [name: S0, handler: S0H]
        | [name: S0, ...options: StepOptions[], handler: S0H]
        | ((props: Scope) => Readonly<[S0, S0H]>)
        | Readonly<[S0, S0H]>
    ]
  ): S0;
  <
    const S0 extends string,
    const S0H extends (props: Scope) => any,
    const S1 extends string,
    const S1H extends (
      props: Props<Scope & Record<"scope", Record<S0, ReturnType<S0H>>>>
    ) => any
  >(
    ...trumpets: [
      step:
        | [name: S0, handler: S0H]
        | [name: S0, ...options: StepOptions[], handler: S0H]
        | ((props: Scope) => Readonly<[S0, S0H]>)
        | Readonly<[S0, S0H]>,
      step:
        | [name: S1, handler: S1H]
        | [name: S1, ...options: StepOptions[], handler: S1H]
        | ((
            props: Props<Scope & Record<"scope", Record<S0, ReturnType<S0H>>>>
          ) => Readonly<[S1, S1H]>)
        | Readonly<[S1, S1H]>
    ]
  ): S0 | S1;
  <
    const S0 extends string,
    const S0H extends (props: Props<Scope>) => any,
    const S1 extends string,
    const S1H extends (
      props: Props<Scope & Record<"scope", Record<S0, ReturnType<S0H>>>>
    ) => any,
    const S2 extends string,
    const S2H extends (
      props: Props<
        Scope &
          Record<"scope", Record<S0, ReturnType<S0H>>> &
          Record<"scope", Record<S1, ReturnType<S1H>>>
      >
    ) => any
  >(
    ...trumpets: [
      step:
        | [name: S0, handler: S0H]
        | [name: S0, ...options: StepOptions[], handler: S0H]
        | ((props: Scope) => Readonly<[S0, S0H]>)
        | Readonly<[S0, S0H]>,
      step:
        | [name: S1, handler: S1H]
        | [name: S1, ...options: StepOptions[], handler: S1H]
        | ((
            props: Props<Scope & Record<"scope", Record<S0, ReturnType<S0H>>>>
          ) => Readonly<[S1, S1H]>)
        | Readonly<[S1, S1H]>,

      step:
        | [name: S2, handler: S2H]
        | [name: S2, ...options: StepOptions[], handler: S2H]
        | ((
            props: Props<
              Scope &
                Record<"scope", Record<S0, ReturnType<S0H>>> &
                Record<"scope", Record<S1, ReturnType<S1H>>>
            >
          ) => Readonly<[S2, S2H]>)
        | Readonly<[S2, S2H]>
    ]
  ): S0 | S1 | S2;
}

export const Steps = (() => {
  return {} as any;
}) as Steps;
