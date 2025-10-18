import { type } from "arktype";
import { StandardSchemaV1 } from "@standard-schema/spec";
import { DeepOptionalString } from "./helpers";

export namespace TaskWish {
  export const TYPE = Symbol.for("TaskWish.type");

  export interface Typed<Type extends string> {
    [TYPE]: Type;
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

  export interface Event<Type extends string, Data>
    extends Typed<Type>,
      Describable<
        {
          data: DeepOptionalString<Data>;
        },
        Event<Type, Data>
      > {
    (data: Data): MessageEvent<Data>;
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

  export interface Scoped<Scope extends Record<any, any>> {
    scope: Scope;
  }

  export type ValidateSchema<Schema> = Schema extends StandardSchemaV1<any>
    ? Schema
    : Schema extends object
    ? type.validate<Schema>
    : object;

  export type InferInput<Schema> = Schema extends StandardSchemaV1<infer Input>
    ? Input
    : type.instantiate<Schema>["infer"];

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
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface Describable<Params, Return> {
    describe(tags: Params & { description?: string }): Return;
  }

  export interface StepOption<T extends string, G extends null | string> {
    stepOptionType: T;
    group: G;
    params?: object;
  }

  export interface Triggerable<Scope extends Record<any, any>> {
    trigger<const Schema>(
      input: ValidateSchema<Schema>
    ): Scoped<Scope & Record<"input", InferInput<Schema>>>;
    trigger<const Type extends string, const Params extends object>(
      event: Event<Type, Params>
    ): Scoped<
      Scope & Record<"input", Params> & Record<"event", Event<Type, Params>>
    >;
  }

  export interface Meta<Type extends string, Params> extends Typed<Type> {
    meta: Params;
    toString: () => string;
  }

  export interface Exception<Status, Params> extends Typed<"Exception"> {
    status: Status;
    exception: Params;
    throw: () => void;
    toString: () => string;
  }
}
