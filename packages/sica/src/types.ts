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

  export const NAME = Symbol.for("Sica.name");

  export const RUN = Symbol.for("Sica.up");

  export const UP = Symbol.for("Sica.up");

  export const DOWN = Symbol.for("Sica.down");

  export interface Typed<Type extends string> {
    [TYPE]: Type;
  }

  export interface Named<Name extends string> {
    [NAME]: Name;
  }

  export interface DefaultCtx {
    abortSignal?: AbortSignal;
  }

  export interface Resource<Name extends string> extends Named<Name> {
    [UP](): AsyncGenerator<string, boolean, unknown>;
    [DOWN](): AsyncGenerator<string, boolean, unknown>;
  }

  export interface Resource<Name extends string, Ctx = DefaultCtx>
    extends Named<Name> {
    [UP](): AsyncGenerator<string, boolean, Ctx>;
    [DOWN](): AsyncGenerator<string, boolean, Ctx>;
  }

  export interface Runnable<Name extends string, Handler extends () => any>
    extends Typed<"action">,
      Named<Name>,
      Resource<Name> {
    [RUN]: Handler;
    (): RunnableReturn<Handler>;
  }

  export interface Action<
    Name extends string,
    Handler extends (...args: any) => any,
  > extends Typed<"action">,
      Named<Name>,
      Resource<Name> {
    [RUN]: Handler;
    (params: ActionInput<Handler>): ActionReturn<Handler>;
  }

  export interface Event<Name extends string, Data>
    extends Typed<"event">,
      Named<Name>,
      Describable<
        {
          data: DeepOptionalString<Data>;
        },
        Event<Name, Data>
      > {
    (data: Data): MessageEvent<Data>;
  }

  export interface Scoped<Scope extends Record<any, any>> {
    scope: Scope;
  }

  export type ValidateTrigger<Name extends string, Schema> =
    Schema extends StandardSchemaV1<any>
      ? Schema
      : Schema extends object
        ? type.validate<
            Schema,
            {
              "Scope.model": string;
            }
          >
        : Schema extends Event<Name, infer Input>
          ? Event<Name, Input>
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
    on<const Name extends string, const Schema>(
      trigger: ValidateTrigger<Name, Schema>
    ): Scoped<Scope & Record<"input", InferInput<Schema>>>;
  }

  export interface Meta<Name extends string, Params>
    extends Typed<"meta">,
      Named<Name> {
    meta: Params;
    toString: () => string;
  }

  export interface Exception<Status, Params> extends Typed<"exception"> {
    status: Status;
    exception: Params;
    throw: () => void;
    toString: () => string;
  }
}
