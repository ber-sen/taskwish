import { Type, type } from "arktype";

export namespace TaskWish {
  export interface Namable<Name extends string> {
    name: Name;
  }
  export interface DefaultCtx {
    abortSignal?: AbortSignal;
  }
  export interface Runnable<
    Name extends string,
    Stream,
    Result,
    Ctx = DefaultCtx
  > extends Namable<Name> {
    (): AsyncGenerator<Stream, Result, Ctx> & Promise<Result>;
  }
  export interface Action<
    Name extends string,
    Params extends Object,
    Stream,
    Result,
    Ctx = DefaultCtx
  > extends Namable<Name> {
    (params: Params): AsyncGenerator<Stream, Result, Ctx> & Promise<Result>;
  }
  export interface Scoped<Scope extends Record<any, any>> {
    scope: Scope;
  }

  export interface Tool<
    Name extends string,
    Input extends Object,
    Stream,
    Output,
    Ctx = DefaultCtx
  > extends Namable<Name> {
    description?: string;
    inputSchema: Type<Input>;
    outputSchema?: Type<Output>;
    handler: (
      input: Input,
      ctx?: DefaultCtx
    ) => AsyncGenerator<Stream, Output, Ctx> | Promise<Output> | Output;
  }

  export interface Resource<
    Name extends string,
    ResultUp,
    ResultDown,
    Stream,
    Ctx = DefaultCtx
  > extends Namable<Name> {
    name: Name;
    up(ctx?: Ctx): ResultUp;
    down(ctx?: Ctx): ResultDown;
    stream(state: "up", ctx?: Ctx): AsyncGenerator<Stream, ResultUp, Ctx>;
    stream(state: "down", ctx?: Ctx): AsyncGenerator<Stream, ResultDown, Ctx>;
  }

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<NewScope & Scope>;
  }

  export interface Describable<Scope extends Record<any, any>> {
    describe(
      description: string,
      meta?: { input: Scope["input"] }
    ): Scoped<Scope>;
  }

  export interface StepOption<T extends string, G extends null | string> {
    stepOptionType: T;
    group: G;
    params?: object;
  }

  export interface Triggerable<Scope extends Record<any, any>> {
    on<const Schema>(
      on: Schema extends Type<infer Schema>
        ? Type<Schema>
        : Schema extends object
        ? type.validate<Schema>
        : object
    ): Scoped<Scope>;
  }

  export interface Exception<Status, Params> {
    status: Status;
    exception: Params;
    throw: () => void;
    toString: () => string;
  }

  export interface Meta<Type extends string, Params> {
    type: Type;
    meta: Params;
    toString: () => string;
  }
}
