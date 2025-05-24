import { type Type, type } from "arktype";

type Ctx = Map<any, any>;

interface Exception<
  Type extends {
    status: number;
  }
> {
  type: Type;
  throw: () => void;
}

export const Exception = <
  const Type extends {
    status: number;
  }
>(
  type: Type
): Exception<Type> => ({
  type,
  throw: () => {
    throw new Error(JSON.stringify(type));
  },
});
interface ActionMeta {
  type?: string;
  exceptions?: Array<Exception<any>>;
}
export interface Runnable<
  Result,
  Meta extends ActionMeta | undefined = undefined
> {
  (ctx?: Ctx): Result;
  meta?: Meta;
}
export interface Action<
  Params,
  Result,
  Meta extends ActionMeta | undefined = undefined
> {
  (params: Params, ctx?: Ctx): Result;
  meta?: Meta;
}

interface ActionMetaParams {
  type: string;
  exceptions?: Array<Exception<any>>;
}

function Action<const Result, const Params>(
  execute: (params: Params, ctx?: Ctx) => Result
): Params extends object ? Action<Params, Result> : Runnable<Result>;

function Action<
  const Params,
  const Result,
  const Meta extends ActionMetaParams
>(
  meta: Meta,
  execute: Params extends object
    ? {
        (params: Params, ctx: Ctx): Result;
        meta?: Meta;
      }
    : {
        (ctx: Ctx): Result;
        meta?: Meta;
      }
): Params extends object
  ? Action<Params, Result, Meta>
  : Runnable<Result, Meta>;

function Action() {
  return {} as any;
}

export type Input<T extends object> = Type<T>;

const Input = <const def>(of: type.validate<def>): type.instantiate<def> =>
  type.raw(of) as never;

//

type CamelCase<T extends string> =
  T extends `${infer Left}${infer Delimiter}${infer Right}`
    ? Delimiter extends " " | "_" | "-" | "." | "," | "!"
      ? `${Left}${Capitalize<ToCamelCase<Right>>}`
      : `${Left}${CamelCase<`${Delimiter}${Right}`>}`
    : T;

type LowercaseFirst<T extends string> = T extends `${infer First}${infer Rest}`
  ? `${Lowercase<First>}${Rest}`
  : T;

type ToCamelCase<T extends string> = LowercaseFirst<CamelCase<T>>;

export type PrettyScope<T> = {
  [K in keyof T as ToCamelCase<Extract<K, string>>]: T[K];
} & {};

export type Props<T> = {
  [K in keyof T as ToCamelCase<Extract<K, string>>]: K extends "scope"
    ? PrettyScope<T[K]>
    : T[K];
} & {};

interface Steps<Scope extends Record<any, any> = {}> {
  <const S0 extends string, const S0H extends (props: Scope) => any>(
    ...trumpets: [
      step: [name: S0, handler: S0H] | ((props: Scope) => Readonly<[S0, S0H]>)
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
      step: [name: S0, handler: S0H] | ((props: Scope) => Readonly<[S0, S0H]>),
      step:
        | [name: S1, handler: S1H]
        | ((
            props: Props<Scope & Record<"scope", Record<S0, ReturnType<S0H>>>>
          ) => Readonly<[S1, S1H]>)
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
      step: [name: S0, handler: S0H] | ((props: Scope) => Readonly<[S0, S0H]>),
      step:
        | [name: S1, handler: S1H]
        | ((
            props: Props<Scope & Record<"scope", Record<S0, ReturnType<S0H>>>>
          ) => Readonly<[S1, S1H]>),
      step:
        | [name: S2, handler: S2H]
        | ((
            props: Props<
              Scope &
                Record<"scope", Record<S0, ReturnType<S0H>>> &
                Record<"scope", Record<S1, ReturnType<S1H>>>
            >
          ) => Readonly<[S2, S2H]>)
    ]
  ): S0 | S1 | S2;
}

const Steps = (() => {
  return {} as any;
}) as Steps;

// Step 3: Final Action stage

Steps(
  ["step 1", () => 3],

  ["step 2", (scope) => scope]
);

type Pretty<T> = { [K in keyof T]: T[K] } & {};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Scoped<Scope extends Record<any, any>> {}

type ConfigurableKey<T> = T extends ConfigurableUseCase<any, infer Used>
  ? Pretty<Omit<T, Used>>
  : never;

interface ConfigurableUseCase<
  Scope extends Record<any, any>,
  Used extends string = ""
> extends Scoped<Scope> {
  handle: <C>(
    callback: (scope: Scope) => C
  ) => ConfigurableKey<ConfigurableUseCase<Scope, Used | "handle">>;
  steps: Steps<Scope>;
}

export interface Extendable<Scope> {
  use<const NewScope>(newScope: NewScope): Extendable<NewScope & Scope>;
}

export interface Inputable<Scope> {
  input<const Schema>(
    input: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): Scoped<Scope & Record<"input", type.instantiate<Schema>["infer"]>>;
}

type UseCaseParams = string;

export interface UseCaseFactory<Params, Scope extends Record<any, any> = {}>
  extends Scoped<Scope>,
    Extendable<Scope>,
    Inputable<Scope>,
    ConfigurableUseCase<Scope> {
  input<const Schema>(
    input: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableUseCase<
    Scope & Record<"input", type.instantiate<Schema>["infer"]>
  >;
  use<const NewScope>(
    newScope: NewScope
  ): UseCaseFactory<Params, NewScope & Scope>;
}

const UseCase = <const Params extends UseCaseParams>(
  name: Params
): UseCaseFactory<Params> => {
  return name as any;
};

interface ConfigurableInfra<Scope extends Record<any, any>> {
  defs: Steps<Scope>;
}

export interface InfraFactory<Params, Scope extends Record<any, any> = {}>
  extends Scoped<Scope>,
    Extendable<Scope>,
    Inputable<Scope>,
    ConfigurableInfra<Scope> {
  input<const Schema>(
    input: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableInfra<
    Scope & Record<"input", type.instantiate<Schema>["infer"]>
  >;
  use<const NewScope>(
    newScope: NewScope
  ): InfraFactory<Params, NewScope & Scope>;
}

const Infra = <const Params extends string>(
  name: Params
): InfraFactory<Params> => {
  return name as any;
};

const stepOptions: unique symbol = Symbol("stepOptions");

// Modifiers

const File = <const K>(key: K, params: { path: string; content: string }) =>
  [key, () => params] as const;

const Step = <const K, const P>(key: K, params: P) =>
  [key, () => params] as const;

const run = <const K>(
  key: K,
  params: { channel: string; text: string; [stepOptions]: any }
) => [key, () => params] as const;

const infra = Infra("asd").defs(
  ["get content", () => "asdas"],

  ({ scope }) =>
    File("config", { path: "./src/config.json", content: scope.getContent }),

  () => File("main", { path: "./src/main.ts", content: "{}" })
);

console.log(infra);

const useCase = UseCase("Say hello")
  .input({ language: "string" })

  .steps(
    ["asdasd", ($) => $.input],

    ({ scope }) =>
      run("Slack.sendMessage", {
        channel: "#general",
        text: `Does someone speak ${scope.asdasd.language}?`,
        [stepOptions]: {},
      }),

    ({ scope }) => Step("asdasd", scope.slackSendMessage)
  );

console.log(useCase);
