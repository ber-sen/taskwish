import { type } from "arktype";
import { StandardSchemaV1 } from "@standard-schema/spec";
import {
  ActionInput,
  ActionReturn,
  RunnableReturn,
  UUIDv7String,
  UUIDv5String,
  DeepOptionalString,
} from "./helpers";
import { Boria } from "./boria";

export namespace Sica {
  export const Type = Symbol.for("Sica.Type");

  export const Scope = Symbol.for("Sica.Scope");

  export interface Typed<Type extends string[]> {
    [Type]: Type;
  }

  export interface Attributable {
    meta(Meta: unknown): unknown;
  }

  export interface Struct<Data, Type extends string[]> extends Typed<Type> {
    data: Data;
  }

  export interface Resource<Type extends string[]> extends Typed<Type> {
    id: UUIDv5String;
  }

  export type Inject<Type> = Type | null;

  export interface NullaryAction<
    Handler extends () => any,
    Type extends string[] = ["action"],
    Meta = null,
  > extends Resource<Type> {
    meta<
      const Tags extends {
        description?: string;
        input?: Handler extends (...args: any) => any
          ? DeepOptionalString<Parameters<Handler>[0]>
          : never;
        output?: Handler extends (...args: any) => any
          ? DeepOptionalString<ReturnType<Handler>>
          : never;
      },
    >(
      meta: Meta extends object ? "get" : Tags
    ): Meta extends object ? Meta : Action<Handler, Type, Tags>;
    <const Scope extends Record<string, any>>(
      scope?: Scope
    ): RunnableReturn<Handler>; // get deps of scope from handler
  }

  export interface Action<
    Handler extends ((...args: any) => any) | GenericHandler,
    Type extends string[] = ["action"],
    Meta = null,
  > extends Attributable,
      Resource<Type> {
    meta<
      const Tags extends {
        description?: string;
        input?: Handler extends (...args: any) => any
          ? DeepOptionalString<Parameters<Handler>[0]>
          : never;
        output?: Handler extends (...args: any) => any
          ? DeepOptionalString<ReturnType<Handler>>
          : never;
      },
    >(
      meta: Meta extends object ? "get" : Tags
    ): Meta extends object ? Meta : Action<Handler, Type, Tags>;
    <Scope extends Array<Provide<any>>>(
      ...args: [...Scope, ActionInput<Handler>]
    ): ActionReturn<Handler>;
  }

  export interface Execution<
    Stream,
    Return,
    Deps,
    Params = null,
    Type extends string[] = ["action"],
  > extends AsyncGenerator<Stream, Return, Deps>,
      Typed<Type>,
      Promise<Return> {
    id: Inject<UUIDv7String>;
    threadId: Inject<Boria.ThreadId>;
    identityId: Inject<Boria.IdentityId>;
    params: Params;
  }

  export interface Event<Data, Type extends string[]> extends Typed<Type> {
    id: Inject<UUIDv7String>;
    threadId: Inject<Boria.ThreadId>;
    identityId: Inject<Boria.IdentityId>;
    handled?: boolean;
    data: Data;
  }

  export type UseCase<
    Object extends { main: () => any },
    Type extends string[] = ["usecase"],
    Meta = null,
  > = Object & Resource<Type> & NullaryAction<Object["main"], Type, Meta>;

  export interface Use<Dep extends Typed<any>> {
    dep: Dep;
  }

  export interface Provide<Dep extends Typed<any>> {
    dep: Dep;
  }

  export interface Log<Data, Type extends string[] = ["info"]> // info, start, warn, success
    extends Typed<Type> {
    id: Inject<UUIDv7String>;
    threadId: Inject<Boria.ThreadId>;
    identityId: Inject<Boria.IdentityId>;
    data: Data;
    toString: () => string;
  }

  export interface Exception<
    Status extends number,
    Data,
    Type extends string[] = ["exception"],
  > extends Typed<Type> {
    id: Inject<UUIDv7String>;
    threadId: Inject<Boria.ThreadId>;
    identityId: Inject<Boria.IdentityId>;
    status: Status;
    data?: Data;
    throw: () => void;
    toString: () => string;
  }

  export abstract class GenericHandler {
    readonly scope?: unknown;
    handler?: (...args: any) => any;
    bind?: (...x: never[]) => unknown;
  }

  export type Generic<T extends Record<any, any>, Key> = T extends {
    scope: Record<any, any>;
  }
    ? T["scope"][Key]
    : T["scope"];

  export interface EventKind<
    Data,
    Type extends string[] = ["event"],
    Meta = null,
  > extends Resource<Type>,
      Attributable {
    meta<Tags extends { scope?: Record<string, any> }>(
      meta: Meta extends object ? "get" : Tags
    ): Meta extends object ? Meta : EventKind<Data, Type, Tags>;
    (data: Data): AsyncGenerator<Event<Data, Type>, Event<Data, Type>, unknown>;
  }

  export type Step<
    Name extends string,
    Result,
    Type extends string[] = ["step"],
    Meta extends { executionId: UUIDv5String } | null = null,
  > = {
    [P in Name]: Result & Typed<Type>;
  } & {
    meta: (param: "get") => Meta;
  };

  export interface Scoped<Scope extends Record<any, any>> {
    [Scope]: Scope;
  }

  export type ValidateSchema<Schema, Scope = {}> =
    Schema extends StandardSchemaV1<any>
      ? Schema
      : type.validate<Schema, Scope>;

  export type InferSchema<Schema, Scope = {}> =
    Schema extends StandardSchemaV1<infer Input>
      ? Input
      : type.instantiate<Schema, Scope>["infer"];

  export type ValidateTrigger<Schema> =
    Schema extends StandardSchemaV1<any>
      ? Schema
      : Schema extends object
        ? type.validate<Schema>
        : Schema extends EventKind<any, infer Input>
          ? EventKind<any, Input>
          : object;

  export type InferTriggerScope<Schema> =
    Schema extends StandardSchemaV1<infer Input>
      ? { input: Input; threadId: Boria.ThreadId; identityId: Boria.IdentityId }
      : Schema extends Event<infer Input, any>
        ? {
            input: Input;
            threadId: Boria.ThreadId;
            identityId: Boria.IdentityId;
          }
        : {
            input: type.instantiate<Schema>["infer"];
            threadId: Boria.ThreadId;
            identityId: Boria.IdentityId;
          };

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface Flow<
    T extends string[],
    Params = {},
    Group extends string[] | null = null,
  > extends Typed<T> {
    group: Group;
    params: Params;
  }

  export interface Triggerable<Scope extends Record<any, any>> {
    on<const Schema>(
      trigger: ValidateTrigger<Schema>
    ): Scoped<Scope & InferTriggerScope<Schema>>;
  }
}
