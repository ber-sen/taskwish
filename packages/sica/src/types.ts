import { type } from "arktype";
import { StandardSchemaV1 } from "@standard-schema/spec";
import {
  RunnableReturn,
  UUIDv7String,
  UUIDv5String,
  DeepOptionalString,
  ActionInput,
  ActionReturn,
} from "./helpers";
import { Boria } from "../../boria";

export namespace Sica {
  export const Type = Symbol.for("Sica.Type");

  export const Meta = Symbol.for("Sica.Meta");

  export interface Typed<Type extends string[]> {
    [Type]: Type;
  }

  export interface Attributable<Meta> {
    [Meta]: Meta;
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
      meta: Meta extends object ? "get" : Tags,
    ): Meta extends object ? Meta : Action<Handler, Type, Tags>;
    <const Ctx extends Record<string, any>>(ctx?: Ctx): RunnableReturn<Handler>; // get deps of scope from handler
  }

  export interface Action<
    Handler extends ((...args: any) => any) | GenericHandler,
    Type extends string[] = ["action"],
    Meta = null,
  > extends Attributable<Meta>,
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
      meta: Meta extends object ? "get" : Tags,
    ): Meta extends object ? Meta : Action<Handler, Type, Tags>;
    <Ctx extends Array<any>>(
      ...args: [...Ctx, ActionInput<Handler>]
    ): ActionReturn<Handler>;
  }

  export class IO {
    threadId!: Boria.ThreadId;
    receiverId!: Boria.IdentityId;
    messages!: Boria.Message<any, any>[];
    send!: <const Content extends Array<Boria.MessagePart<any>> | string>(
      message: Boria.Message<Content>,
    ) => Event<Boria.Message<Content>>;
  }

  export abstract class Trait {
    static [Symbol.hasInstance](obj: any) {
      return Boolean(obj?.traits?.has?.(this));
    }
  }

  export interface Event<Data, Type extends string[] = ["event"]>
    extends Typed<Type> {
    id: Inject<UUIDv7String>;
    io: IO;
    data: Data;
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
    eventId: Inject<UUIDv7String>;
    params: Params;
  }

  export type Actor<
    Object extends { main: () => any },
    Type extends string[] = ["Actor"],
    Meta = null,
  > = Object & Resource<Type> & NullaryAction<Object["main"], Type, Meta>;

  export interface Log<Data, Type extends string[] = ["info"]> // info, start, warn, success
    extends Typed<Type> {
    id: Inject<UUIDv7String>;
    eventId: Inject<UUIDv7String>;
    data: Data;
    toString: () => string;
  }

  export interface Exception<
    Status extends number,
    Data,
    Type extends string[] = ["exception"],
  > extends Typed<Type> {
    id: Inject<UUIDv7String>;
    eventId: Inject<UUIDv7String>;
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
      Attributable<Meta> {
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

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface Triggerable<Scope extends Record<any, any>> {
    on<const Schema>(
      trigger: ValidateTrigger<Schema>,
    ): Triggerable<Scope & InferTriggerScope<Schema>>;
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
      ? { input: Input; event: Event<Input>; io: IO }
      : Schema extends (...args: any) => any
        ? ReturnType<Schema> extends { Event: EventKind<infer Input, any> }
          ? {
              input: Input;
              event: Event<Input>;
              io: IO;
            }
          : never
        : Schema extends Event<infer Input, any>
          ? {
              input: Input;
              event: Event<Input>;
              io: IO;
            }
          : {
              input: type.instantiate<Schema>["infer"];
              event: Event<type.instantiate<Schema>["infer"]>;
              io: IO;
            };
}
