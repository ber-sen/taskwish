import { type Type, type } from "arktype";

interface Meta<
  Params extends {
    type: string;
  }
> {
  meta: Params;
  toString: () => string;
}

export const Meta = <
  const Params extends {
    type: string;
  }
>(
  meta: Params
): Meta<Params> => ({
  meta,
  toString: () => JSON.stringify(meta),
});

interface Exception<
  Params extends {
    status: number;
  }
> {
  exception: Params;
  throw: () => void;
  toString: () => string;
}

export const Exception = <
  const Params extends {
    status: number;
  }
>(
  exception: Params
): Exception<Params> => ({
  exception,
  throw: () => {
    throw new Error(JSON.stringify(type));
  },
});

export interface Runnable<Stream, Result, Ctx> {
  use: (ctx: Ctx) => Omit<Runnable<Stream, Result, Ctx>, "ctx">;
  run(): Promise<Result>;
  stream(): AsyncGenerator<Stream, Result, undefined>;
}
export interface Action<Params extends Array<any>, Stream, Result, Ctx> {
  use: (ctx: Ctx) => Omit<Action<Params, Stream, Result, Ctx>, "ctx">;
  run(...params: Params): Promise<Result>;
  stream(...params: Params): AsyncGenerator<Stream, Result, undefined>;
}

function Action<Params extends Array<any>, Stream, Result, Ctx>(
  execute: (
    ...params: Params
  ) => AsyncGenerator<Stream, Result, Ctx> | Generator<Stream, Result, Ctx>
): Params extends object
  ? Action<Params, Stream, Result, Ctx>
  : Runnable<Stream, Result, Ctx> {
  return execute as any;
}

export type Entry<T extends object> = Type<T>;

const Entry = <const def>(of: type.validate<def>): type.instantiate<def> =>
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

interface StepOptions {
  timeout?: string | number;
  retries?: {
    limit: number;
    delay?: string | number;
    backoff?: "constant" | "linear" | "exponential";
  };
}

interface Steps<Scope extends Record<any, any> = {}> {
  <const S0 extends string, const S0H extends (props: Scope) => any>(
    ...trumpets: [
      step:
        | [name: S0, handler: S0H]
        | [name: S0, ...options: StepOptions[], handler: S0H]
        | ((props: Scope) => Readonly<[S0, S0H]>)
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
        | ((props: Scope) => Readonly<[S0, S0H]>),
      step:
        | [name: S1, handler: S1H]
        | [name: S1, ...options: StepOptions[], handler: S1H]
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
      step:
        | [name: S0, handler: S0H]
        | [name: S0, ...options: StepOptions[], handler: S0H]
        | ((props: Scope) => Readonly<[S0, S0H]>),
      step:
        | [name: S1, handler: S1H]
        | [name: S1, ...options: StepOptions[], handler: S1H]
        | ((
            props: Props<Scope & Record<"scope", Record<S0, ReturnType<S0H>>>>
          ) => Readonly<[S1, S1H]>),
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

export interface Startable<Scope> {
  entry<const Schema>(
    entry: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): Scoped<Scope & Record<"entry", type.instantiate<Schema>["infer"]>>;
}

type UseCaseParams = string;

export interface UseCaseFactory<Params, Scope extends Record<any, any> = {}>
  extends Scoped<Scope>,
    Extendable<Scope>,
    Startable<Scope>,
    ConfigurableUseCase<Scope> {
  entry<const Schema>(
    entry: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableUseCase<
    Scope & Record<"entry", type.instantiate<Schema>["infer"]>
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
    Startable<Scope>,
    ConfigurableInfra<Scope> {
  entry<const Schema>(
    entry: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableInfra<
    Scope & Record<"entry", type.instantiate<Schema>["infer"]>
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

const Options: unique symbol = Symbol("Options");

// StepOptions

const withTimeout = (timeout: number) => ({
  timeout,
});

// Modifiers

const File = <const K>(key: K, params: { path: string; content: string }) =>
  [key, () => params] as const;

const Step = <const K, const P>(key: K, params: P) =>
  [key, () => params] as const;

const Run = <const K>(
  key: K,
  params: { channel: string; text: string; [Options]?: any }
) => [key, () => params] as const;

const Triggers = (asd: string) => ({ language: "string" }) as const;

const infra = Infra("asd").defs(
  ["get content", () => "asdas"],

  ({ scope }) =>
    File("config", { path: "./src/config.json", content: scope.getContent }),

  () => File("main", { path: "./src/main.ts", content: "{}" })
);

const useCase = UseCase("Say hello")
  .entry({ language: "string" })

  .steps(
    ["asdasd", ($) => $.entry],

    ({ scope }) =>
      Run("Slack.sendMessage", {
        channel: "#general",
        text: `Does someone speak ${scope.asdasd.language}?`,
        [Options]: [withTimeout(40)],
      }),

    ({ scope }) => Step("asdasd", scope.slackSendMessage)
  );

const workflow = UseCase("Say hello")
  .entry(Triggers("Gmail.newEmail"))

  .steps(
    ["asdasd", ($) => $.entry],

    ({ scope }) =>
      Run("Slack.sendMessage", {
        channel: "#general",
        text: `Does someone speak ${scope.asdasd.language}?`,
        [Options]: [withTimeout(40)],
      }),

    ({ scope }) => Step("asdasd", scope.slackSendMessage)
  );

function* getEnv<T extends object>(): Generator<
  Meta<{
    type: "requires";
    requires: "ctx";
    data: T;
  }>,
  T,
  Record<"env", T>
> {
  const ctx = yield Meta({ type: "requires", requires: "ctx", data: {} as T });

  return ctx.env;
}

const fetchUsers = Action(async function* (params: { name: string }) {
  const env = yield* getEnv<{ DATABASE_API_KEY: string }>();

  return await Promise.resolve(env.DATABASE_API_KEY + params.name);
});

async function* steps() {
  const res = yield* fetchUsers.stream({ name: "asdasd" });

  yield Meta({ type: "result", data: res });
  yield Exception({ status: 400 });
  yield 4;

  return 3;
}
