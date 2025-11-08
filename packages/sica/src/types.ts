import { type } from "arktype";
import { StandardSchemaV1 } from "@standard-schema/spec";
import {
  ActionInput,
  ActionReturn,
  DeepOptionalString,
  RunnableReturn,
} from "./helpers";

export namespace Sica {
  export const TYPE = Symbol.for("Sica.type");

  export const RUN = Symbol.for("Sica.run");

  export const UP = Symbol.for("Sica.up");

  export const DOWN = Symbol.for("Sica.down");

  export interface Typed<Type extends string[]> {
    [TYPE]: Type;
  }
  export interface DefaultCtx {
    abortSignal?: AbortSignal;
  }

  export interface Resource<Type extends string[]> extends Typed<Type> {
    [UP](): AsyncGenerator<string, boolean, unknown>;
    [DOWN](): AsyncGenerator<string, boolean, unknown>;
  }

  export interface Runnable<
    Handler extends () => any,
    Type extends string[] = ["action"],
  > extends Resource<Type> {
    [RUN]: Handler;
    (): RunnableReturn<Handler>;
  }

  export abstract class GenericHandler {
    readonly scope?: unknown;
    handler?: unknown;
    bind?: (...x: never[]) => unknown;
  }

  export type Generic<T extends Record<any, any>, Key> = T extends {
    scope: Record<any, any>;
  }
    ? T["scope"][Key]
    : T["scope"];

  export interface Action<
    Handler extends ((...args: any) => any) | GenericHandler,
    Type extends string[] = ["action"],
  > extends Resource<Type> {
    [RUN]: Handler;
    (params: ActionInput<Handler>): ActionReturn<Handler>;
  }

  export interface Event<Data, Type extends string[] = ["event"]>
    extends Resource<Type>,
      Describable<
        {
          data: DeepOptionalString<Data>;
        },
        Event<Data, Type>
      > {
    (data: Data): MessageEvent<Data>;
  }

  export interface Scoped<Scope extends Record<any, any>> {
    scope: Scope;
  }

  export type ValidateTrigger<Schema, Type extends string[] = []> =
    Schema extends StandardSchemaV1<any>
      ? Schema
      : Schema extends object
        ? type.validate<
            Schema,
            {
              "Scope.model": string;
            }
          >
        : Schema extends Event<Type, infer Input>
          ? Event<Type, Input>
          : object;

  export type ValidateSchema<Schema> =
    Schema extends StandardSchemaV1<any>
      ? Schema
      : Schema extends object
        ? type.validate<
            Schema,
            {
              "Scope.model": string;
            }
          >
        : object;

  export type InferInput<Schema> =
    Schema extends StandardSchemaV1<infer Input>
      ? Input
      : Schema extends Event<any, infer Input>
        ? Input
        : type.instantiate<Schema>["infer"];

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface Describable<Params, Return> {
    describe<const Tags extends { description?: string } & Params>(
      tags: Tags
    ): Return;
  }

  export interface StepOption<T extends string, G extends null | string> {
    stepOptionType: T;
    group: G;
    params?: object;
  }

  export interface Triggerable<Scope extends Record<any, any>> {
    on<const Type extends string[], const Schema>(
      trigger: ValidateTrigger<Schema, Type>
    ): Scoped<Scope & Record<"input", InferInput<Schema>>>;
  }

  export interface Use<Dep extends Typed<any>> {
    dep: Dep;
  }

  export interface Struct<Data, Type extends string[]> extends Typed<Type> {
    data: Data;
  }

  export interface Exception<Status extends number, Params>
    extends Typed<["exception"]> {
    status: Status;
    exception: Params;
    throw: () => void;
    toString: () => string;
  }
}
