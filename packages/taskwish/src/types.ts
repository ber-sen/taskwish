import { Type as ArkType, type } from "arktype";

export namespace TaskWish {
  export interface Typed<Type extends string> {
    type: Type;
  }
  export interface DefaultCtx {
    abortSignal?: AbortSignal;
  }
  export interface Runnable<
    Type extends string,
    Stream,
    Result,
    Ctx = DefaultCtx
  > extends Typed<Type> {
    (): AsyncGenerator<Stream, Result, Ctx> & Promise<Result>;
  }
  export interface Action<
    Type extends string,
    Params extends Object,
    Stream,
    Result,
    Ctx = DefaultCtx
  > extends Typed<Type> {
    (params: Params): AsyncGenerator<Stream, Result, Ctx> & Promise<Result>;
  }
  export interface Scoped<Scope extends Record<any, any>> {
    scope: Scope;
  }

  export interface Tool<
    Type extends string,
    Input extends Object,
    Stream,
    Output,
    Ctx = DefaultCtx
  > extends Typed<Type> {
    name?: Type;
    description?: string;
    inputSchema: ArkType<Input>;
    outputSchema?: ArkType<Output>;
    handler: (
      input: Input,
      ctx?: DefaultCtx
    ) => AsyncGenerator<Stream, Output, Ctx> | Promise<Output> | Output;
  }

  export interface Resource<
    Type extends string,
    Result,
    Stream,
    Ctx = DefaultCtx
  > extends Typed<Type>,
      AsyncGenerator<Stream, Result, Ctx>,
      Promise<Result> {
    up(ctx?: Ctx): boolean;
    down(ctx?: Ctx): boolean;
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
      on: Schema extends ArkType<infer Schema>
        ? ArkType<Schema>
        : Schema extends object
        ? type.validate<Schema>
        : object
    ): Scoped<Scope>;
  }

  export interface Meta<Type extends string, Params> extends Typed<Type> {
    meta: Params;
    toString: () => string;
  }
  export interface Exception<Status, Params> {
    status: Status;
    exception: Params;
    throw: () => void;
    toString: () => string;
  }
}
