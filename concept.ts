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
export interface Executable<
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
): Params extends object ? Action<Params, Result> : Executable<Result>;

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
  : Executable<Result, Meta>;

function Action() {
  return {} as any;
}

export type Input<T extends object> = Type<T>;

const Input = <const def>(of: type.validate<def>): type.instantiate<def> =>
  type.raw(of) as never;

//

interface Steps<Scope> {
  <const S0 extends string, const S0H extends (props: Scope) => any>(
    ...trumpets: [
      step: [name: S0, handler: S0H] | ((props: Scope) => Readonly<[S0, S0H]>)
    ]
  ): S0;
  <
    const S0 extends string,
    const S0H extends (props: Scope) => any,
    const S1 extends string,
    const S1H extends (props: Scope) => any
  >(
    ...trumpets: [
      step: [name: S0, handler: S0H] | ((props: Scope) => Readonly<[S0, S0H]>),
      step: [name: S1, handler: S1H] | ((props: Scope) => Readonly<[S1, S1H]>)
    ]
  ): S0 | S1;
  <
    const S0 extends string,
    const S0H extends (props: Scope) => any,
    const S1 extends string,
    const S1H extends (props: Scope) => any,
    const S2 extends string,
    const S2H extends (props: Scope) => any
  >(
    ...trumpets: [
      step: [name: S0, handler: S0H] | ((props: Scope) => Readonly<[S0, S0H]>),
      step: [name: S1, handler: S1H] | ((props: Scope) => Readonly<[S1, S1H]>),
      step: [name: S2, handler: S2H] | ((props: Scope) => Readonly<[S2, S2H]>)
    ]
  ): S0 | S1 | S2;
  <
    const S0 extends string,
    const S0H extends (props: Scope) => any,
    const S1 extends string,
    const S1H extends (props: Scope) => any,
    const S2 extends string,
    const S2H extends (props: Scope) => any,
    const S3 extends string,
    const S3H extends (props: Scope) => any
  >(
    ...trumpets: [
      step: [name: S0, handler: S0H] | ((props: Scope) => Readonly<[S0, S0H]>),
      step: [name: S1, handler: S1H] | ((props: Scope) => Readonly<[S1, S1H]>),
      step: [name: S2, handler: S2H] | ((props: Scope) => Readonly<[S2, S2H]>),
      step: [name: S3, handler: S3H] | ((props: Scope) => Readonly<[S3, S3H]>)
    ]
  ): S2;
}

const Steps = (() => {
  return {} as any;
}) as Steps<number>;

// Step 3: Final Action stage

Steps(
  ["step 1", () => 3],

  ["step 2", (scope) => scope],

  ["step 3", (scope) => scope]
);

type Pretty<T> = { [K in keyof T]: T[K] } & {};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Scoped<Scope> {}

type ConfigurableKey<T> = T extends ConfigurableUseCase<any, infer Used>
  ? Pretty<Omit<T, Used>>
  : never;

interface ConfigurableUseCase<Scope, Used extends string = "">
  extends Scoped<Scope> {
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

export interface UseCaseFactory<Params, Scope = {}>
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

interface ConfigurableInfra<Scope> {
  defs: Steps<Scope>;
}

export interface InfraFactory<Params, Scope = {}>
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

// Modifiers

const File = <const K>(key: K, params: { path: string; content: string }) =>
  [key, () => params] as const;

const Step = <const K, const P>(key: K, params: P) =>
  [key, () => params] as const;

const trigger = <const K>(key: K, params: { channel: string; text: string }) =>
  [key, () => params] as const;

const infra = Infra("asd").defs(
  ["step 2", (scope) => scope],

  () => File("config", { path: "./src/config.json", content: "{}" }),

  () => File("main", { path: "./src/main.ts", content: "{}" })
);

console.log(infra);

const useCase = UseCase("Say hello")
  .input({ language: "string" })

  .steps(
    ["asdasd", ($) => $.input],

    ({ input }) => Step("asdasd", input),

    ({ input }) =>
      trigger("Slack.sendMessage", {
        channel: "#general",
        text: `Does someone speak ${input.language}?`,
      })
  );

console.log(useCase);
