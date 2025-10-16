import { type } from "arktype";
import { StandardSchemaV1 } from "@standard-schema/spec";

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
    Name extends string,
    Input extends Object,
    Stream,
    Output,
    Ctx = DefaultCtx
  > {
    name?: Name;
    description?: string;
    inputSchema: StandardSchemaV1<Input>;
    outputSchema?: StandardSchemaV1<Output>;
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
    trigger<const Schema>(
      input: Schema extends StandardSchemaV1<infer Schema>
        ? StandardSchemaV1<Schema>
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
