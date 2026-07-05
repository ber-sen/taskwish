import { UUIDv7String, ValidateTrigger, InferTriggerScope, Pretty } from "./helpers";

import { Type as ArkType } from "arktype";

export namespace TW {
  export const Name = Symbol.for("TW.Name");

  export const Meta = Symbol.for("TW.Meta");

  export const Step = Symbol.for("TW.Step");

  export const Scope = Symbol.for("TW.Ctx");

  export const Type = Symbol.for("TW.Type");

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
  export abstract class Handler {
    readonly ctx!: Record<"model", unknown>;
    run?: (...x: never[]) => Promise<any>;
  }

  type EventKindNames<S> = {
    [K in keyof S]: S[K] extends EventKind<infer Name, any> ? Name : never;
  }[keyof S];

  type EventKindForName<S, Name extends string> = {
    [K in keyof S]: S[K] extends EventKind<infer EventName, any>
      ? Name extends EventName
        ? S[K]
        : never
      : never;
  }[keyof S];

  type EventKindData<S, K extends string> = EventKindForName<
    S,
    K
  > extends EventKind<any, infer D extends Record<string, unknown>>
    ? D
    : Record<string, unknown>;

  type EventKindName<S, K extends string> = EventKindForName<
    S,
    K
  > extends EventKind<infer N extends string, any>
    ? N
    : K;

  type StripEventKinds<S> = {
    [K in keyof S as S[K] extends EventKind<any, any, any> ? never : K]: S[K];
  };

  export type Scope<S> = StripEventKinds<S> & {
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
      Signal<EventKindName<S, T & string>, EventKindData<S, T & string>>["data"],
      unknown
    >;
    get<T>(Cls: new (...args: any[]) => T): T;
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

  export type GetEvent<T = unknown> = {
    "->": "get";
    type: abstract new (...args: any[]) => T;
  };

  type StreamInput<Handler extends (...args: any) => any> =
    Parameters<Handler> extends []
      ? undefined
      : Parameters<Handler> extends [infer Input]
        ? Input
        : Parameters<Handler>;

  type StreamResult<Handler extends (...args: any) => any> = Awaited<
    ReturnType<Handler>
  >;

  type StreamYield<
    Name extends string,
    Handler extends (...args: any) => any,
  > =
    | ActionInputEvent<Resource<Name>, StreamInput<Handler>>
    | ActionEvent<Name, StreamResult<Handler>, StreamInput<Handler>>;

  type StreamReturn<
    Name extends string,
    Handler extends (...args: any) => any,
  > = AsyncGenerator<StreamYield<Name, Handler>, StreamResult<Handler>>;

  export type Action<
    Name extends string,
    Handler extends (...args: any) => any,
    Meta = null,
  > = NoInfer<Handler> & {
    stream: (
      ...args: Parameters<NoInfer<Handler>>
    ) => StreamReturn<Name, Handler>;
  } & Resource<Name> &
    Attributable<Meta>;

  export class IO {
    // threadId!: Message.ThreadId;
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

  export interface Actor<Name extends string> extends Resource<Name> {}

  export interface Service<Name extends string> extends Resource<Name> {}

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

  export interface EventKind<Name extends string, Data, Scope = {}>
    extends Resource<Name>,
      Attributable<null> {
    emit(
      data: Data,
    ): AsyncGenerator<Signal<Name, Data>, Signal<Name, Data>, unknown>;
    scopeOf?: (input: Data) => Scope;
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

  export class Signal<const Type extends string, const Data> {
    readonly event = "TW::Signal";
    data: Pretty<{ "->": Type } & Data>;

    constructor(type: Type, data: Data) {
      this.data = Object.assign({ "->": type }, data);
    }
  }

  export class Trace<const Type extends string, const Data extends object> {
    readonly event!: "TW::Trace";
    readonly data!: Pretty<{ ">>": Type } & Data>;

    static [Symbol.hasInstance](value: unknown): boolean {
      return (
        value !== null &&
        typeof value === "object" &&
        (value as { event?: unknown }).event === "TW::Trace"
      );
    }

    constructor(type: Type, data: Data) {
      const trace = Object.assign({ ">>": type }, data) as Pretty<
        { ">>": Type } & Data
      >;
      Object.defineProperties(trace, {
        event: { value: "TW::Trace" },
        data: { value: trace },
      });
      return trace as unknown as Trace<Type, Data>;
    }
  }

  export type ActionInputEvent<Action extends Resource<string>, Params> = {
    "->": string;
    "&": Action;
    input: Params;
  };

  type ActionCaller<Caller> = Extract<
    Caller,
    ActionInputEvent<Resource<string>, any>
  >;

  export type Step<
    Name extends string,
    Handler extends (...args: any) => any,
  > = ReturnType<Handler> extends AsyncGenerator<infer Caller, any, any>
    ? [ActionCaller<Caller>] extends [never]
      ? ScriptStep<Name, Handler>
      : ActionCaller<Caller> extends ActionInputEvent<infer A, infer P>
      ? A extends Resource<infer ActionName>
        ? ActionStep<Name, ActionName, P>
        : ScriptStep<Name, Handler>
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
