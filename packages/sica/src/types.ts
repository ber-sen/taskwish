import {
  RunnableReturn,
  UUIDv7String,
  UUIDv5String,
  DeepOptionalString,
  ActionInput,
  ActionReturn,
  ValidateTrigger,
  InferTriggerScope,
  PrettyScope,
} from "./helpers";
import { Boria } from "../../boria";

export namespace Sica {
  export const Type = Symbol.for("Sica.Type");

  export const Meta = Symbol.for("Sica.Meta");

  export const Scope = Symbol.for("Sica.Scope");

  export const Traits = Symbol.for("Sica.Traits");

  export interface Typed<Type extends string[]> {
    [Type]: Type;
  }

  export interface Attributable<Meta> {
    [Meta]: Meta;
  }

  export interface Resource<Type extends string[]> extends Typed<Type> {
    id: UUIDv5String;
  }

  export type Scope<Scope> = PrettyScope<Scope> & {
    <T>(Cls: new (...args: any[]) => T): Generator<unknown, T, T>;
  };

  export abstract class HasTraits {
    public [Traits]: Array<any> = [];
    static [Symbol.hasInstance](obj: any) {
      return Boolean(obj?.traits?.has?.(this));
    }
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
      Resource<Type>,
      Traits {
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
    dispatch(
      data: Data,
    ): AsyncGenerator<Event<Data, Type>, Event<Data, Type>, unknown>;
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

  export interface Scoped<Scope> {
    [Scope]: Scope;
  }

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface Triggerable<Scope extends Record<any, any>> {
    on<const Schema>(
      trigger: ValidateTrigger<Schema>,
    ): Scoped<Scope & InferTriggerScope<Schema>>;
  }
}
