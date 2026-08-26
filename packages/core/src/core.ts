import {
  UUIDv7String,
  ValidateTrigger,
  InferTriggerScope,
  Pretty,
  OmitListeners,
  PickListeners,
  StreamInput,
  StreamResult,
  StripEventKinds,
} from "./helpers";

import { Type as ArkType } from "arktype";
import type {
  Signal,
  Trace,
} from "@taskwish/wire";

export namespace TW {
  export const Name = Symbol.for("TW.Name");

  export const Meta = Symbol.for("TW.Meta");

  export const InputSchema = Symbol.for("TW.InputSchema");

  export const Step = Symbol.for("TW.Step");

  export const Scope = Symbol.for("TW.Ctx");

  export const Listeners = Symbol.for("TW.Listeners");

  export const Type = Symbol.for("TW.Type");

  export const Branch: unique symbol = Symbol.for("TW.Branch") as never;

  export const Union: unique symbol = Symbol.for("TW.Union") as never;

  export interface Contextual<Ctx extends Record<any, any>> {
    [Scope]: Ctx["scope"];
  }

  export interface Named<Name extends string> {
    [Name]: Name;
  }

  export interface Attributable<Meta> {
    [Meta]: Meta;
  }

  export interface Resource<Name extends string> extends Named<Name> {}

  export type Configurable<Type> = Type;

  export abstract class Handler {
    readonly ctx!: Record<"model", unknown>;
    run?: (...x: never[]) => Promise<any>;
  }

  type EventKindNames<S> = {
    [K in keyof S]: S[K] extends EventKind<infer Name, any, any> ? Name : never;
  }[keyof S];

  type EventKindForName<S, Name extends string> = {
    [K in keyof S]: S[K] extends EventKind<infer EventName, any, any>
      ? Name extends EventName
        ? S[K]
        : never
      : never;
  }[keyof S];

  type EventKindData<S, K extends string> = EventKindForName<
    S,
    K
  > extends EventKind<any, infer D extends Record<string, unknown>, any>
    ? D
    : Record<string, unknown>;

  type EventKindName<S, K extends string> = EventKindForName<
    S,
    K
  > extends EventKind<infer N extends string, any, any>
    ? N
    : K;

  type StripBranch<T> = T extends Branch<any, any, infer Runtime>
    ? Runtime
    : T;

  type UserScope<S> = {
    [K in keyof StripEventKinds<S> as K extends typeof Branch
      ? never
      : K]: StripBranch<StripEventKinds<S>[K]>;
  };

  export type Scope<S> = UserScope<S> & {
    abortSignal?: Configurable<AbortSignal>;
    self: <Return = any>(
      input: S extends Record<any, any>
        ? S["input"] extends Record<any, any>
          ? S["input"]
          : never
        : never,
    ) => Return;
    signal<
      T extends [EventKindNames<S>] extends [never]
        ? string
        : EventKindNames<S>,
    >(
      type: T,
      data: EventKindData<S, T & string>,
    ): AsyncGenerator<
      Signal<EventKindName<S, T & string>, EventKindData<S, T & string>>,
      Signal<
        EventKindName<S, T & string>,
        EventKindData<S, T & string>
      >["data"],
      unknown
    >;
  };

  export type Inject<Type> = Type | null;

  export type StepEvent<Result = unknown> =
    | Trace<string, { result: Result }>
    | Trace<string, { error: unknown }>;

  export type ActionEvent<
    Name extends string,
    Result = unknown,
    Input = unknown,
  > =
    | Trace<Name, { input: Input }>
    | Trace<Name, { result: Result }>
    | Trace<Name, { error: unknown }>;

  export type Branch<Input, Result, Runtime = Result> = Runtime & {
    readonly [Branch]: {
      input: Input;
      result: Result;
    };
  };

  /** Marks a framework-provided union while preserving its runtime shape. */
  export type Union<Type> = Type extends unknown
    ? [Type] extends [void]
      ? Type
      : Type & { readonly [Union]: Type }
    : never;

  /** Removes the type-only marker from a framework-provided union member. */
  export type UnwrapUnion<Type> = Type extends {
    readonly [Union]: infer Value;
  }
    ? Value
    : Type;

  type UnionToIntersection<U> = (
    U extends unknown ? (value: U) => void : never
  ) extends (value: infer I) => void
    ? I
    : never;

  type OverloadedHandler<Handler extends (...args: any) => any> =
    UnionToIntersection<Handler> extends infer Overloaded extends (
      ...args: any
    ) => any
      ? Overloaded
      : never;

  export type Action<
    Name extends string,
    Handler extends (...args: any) => any,
    Meta = null,
  > = OverloadedHandler<NoInfer<Handler>> &
    ActionRuntime<Name, OverloadedHandler<NoInfer<Handler>>> & {
      ctx(
        context?: ActionContext<ActionContextScopeFromMeta<Meta>>,
      ): ActionRuntime<Name, OverloadedHandler<NoInfer<Handler>>>;
    } & Resource<Name> &
    Attributable<Meta>;

  export type ActionCtxMeta<
    Meta,
    Ctx extends Record<any, any>,
  > = keyof Omit<Ctx, "abortSignal"> extends never
    ? Meta
    : Pretty<(Meta extends null ? {} : Meta) & { ctx: Ctx }>;

  type ActionContextScopeFromMeta<Meta> = Meta extends {
    ctx: infer Ctx extends Record<any, any>;
  }
    ? Ctx
    : { abortSignal?: Configurable<AbortSignal> };

  export type ActionContext<
    Ctx extends Record<any, any> = {
      abortSignal?: Configurable<AbortSignal>;
    },
  > = AbortSignal | Ctx;

  export type ActionRuntime<
    Name extends string,
    Handler extends (...args: any) => any,
  > = {
    run: NoInfer<Handler>;
    stream: ((
      ...args: Parameters<NoInfer<Handler>>
    ) => AsyncGenerator<
      ActionEvent<Name, StreamResult<Handler>, StreamInput<Handler>>,
      StreamResult<Handler>
    >) &
      NoInfer<Handler>;
  };

  export class IO {
    // sessionId!: Message.SessionId;
    // senderId!: Message.IdentityId;
    // receiverId!: Message.IdentityId;
    // messages!: Message.Message<any, any>[];
    // reply!: <const Content extends Array<Message.MessagePart<any>> | string>(
    //   message: Message.Message<Content>,
    // ) => Event<"Message", Message.Message<Content>>;
  }

  export interface Execution<Stream, Return, Deps, Params = null>
    extends AsyncGenerator<Stream, Return, Deps>,
      Promise<Return> {
    id: Inject<UUIDv7String>;
    eventId: Inject<UUIDv7String>;
    params: Params;
  }

  export type Service<Name extends string, Actions, ServiceScope = {}> =
    OmitListeners<Actions> & {
    [Name]: Name;
    [Listeners]: PickListeners<Actions>;
    [Scope]: ServiceScope;
  };

  export interface Log<Data> {
    id: Inject<UUIDv7String>;
    eventId: Inject<UUIDv7String>;
    data: Data;
    toString: () => string;
  }

  export interface Exception<Status extends number, Data> {
    id: Inject<UUIDv7String>;
    eventId: Inject<UUIDv7String>;
    status: Status;
    data?: Data;
    throw: () => void;
    toString: () => string;
  }

  export interface EventKind<Name extends string, Data, Meta = null>
    extends Resource<Name>,
      Attributable<Meta> {
    emit(
      data: Data,
    ): AsyncGenerator<Signal<Name, Data>, Signal<Name, Data>, unknown>;
  }

  export type Struct<Name extends string, TypeDef> = ArkType<TypeDef> &
    Resource<Name>;

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface Triggerable<Ctx extends Record<any, any>> {
    on<const Schema>(
      trigger: ValidateTrigger<Schema>,
    ): Contextual<Ctx & InferTriggerScope<Schema>>;
  }

  export interface ResourceKind<Name extends string> extends Named<Name> {}

  export class Stream<const Data> {
    readonly event = "TW::Stream";

    constructor(public data: Data) {}
  }

  export type Step<
    Name extends string,
    Handler extends (...args: any) => any,
  > = ReturnType<Handler> extends AsyncGenerator<infer Caller, any, any>
    ? [Extract<Caller, Trace<string, { input: any }>>] extends [never]
      ? ScriptStep<Name, Handler>
      : Extract<Caller, Trace<string, { input: any }>> extends Trace<
          infer ActionName,
          { input: infer P }
        >
      ? ActionStep<Name, ActionName, P>
      : ScriptStep<Name, Handler>
    : ScriptStep<Name, Handler>;

  export interface ScriptStep<
    Name extends string,
    Handler extends (...args: any) => any,
  > {
    $: "step";
    "=": Name;
    run: string;
  }

  export type ActionStep<
    Name extends string,
    ActionName extends string,
    Params,
  > = {
    $: ActionName;
    "=": Name;
  } & Params;
}
