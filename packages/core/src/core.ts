import {
  UUIDv7String,
  UUIDv5String,
  ValidateTrigger,
  InferTriggerScope,
} from "./helpers";

import { Type as ArkType } from "arktype";

export namespace TW {
  export const Name = Symbol.for("TW.Name");

  export const Meta = Symbol.for("TW.Meta");

  export const Step = Symbol.for("TW.Step");

  export const Scope = Symbol.for("TW.Ctx");

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

  export type Scope<Scope> = Scope & {
    get<T>(Cls: new (...args: any[]) => T): T;
  };

  export type Inject<Type> = Type | null;

  export type StepEvent<Result = unknown> =
    | { $: "step"; name: string; result: Result }
    | { $: "step"; name: string; error: unknown };

  export type ActionEvent<Name extends string, Result = unknown> =
    | { $: "action"; name: Name; input: unknown }
    | { $: "action"; name: Name; result: Result }
    | { $: "action"; name: Name; error: unknown };

  export type GetEvent<T = unknown> = { $: "get"; type: abstract new (...args: any[]) => T };

  type StreamReturn<Name extends string, Handler extends (...args: any) => any> =
    Awaited<ReturnType<Handler>> extends AsyncGenerator<infer Y, infer R>
      ? AsyncGenerator<Y | StepEvent | ActionEvent<Name, Awaited<R>>, Awaited<R>>
      : AsyncGenerator<StepEvent | ActionEvent<Name, Awaited<ReturnType<Handler>>>, Awaited<ReturnType<Handler>>>;

  export type Action<
    Name extends string,
    Handler extends (...args: any) => any,
    Meta = null,
  > = NoInfer<Handler> & {
    stream: (...args: Parameters<NoInfer<Handler>>) => StreamReturn<Name, Handler>;
  } & Resource<Name> & Attributable<Meta>;

  export class IO {
    // threadId!: Message.ThreadId;
    // senderId!: Message.IdentityId;
    // receiverId!: Message.IdentityId;
    // messages!: Message.Message<any, any>[];
    // reply!: <const Content extends Array<Message.MessagePart<any>> | string>(
    //   message: Message.Message<Content>,
    // ) => Event<"Message", Message.Message<Content>>;
  }

  export interface Event<
    Type extends string,
    Data,
    Meta extends Record<any, any> = {},
  > extends Attributable<Meta> {
    id: Inject<UUIDv7String>;
    data: Data;
    type: Type;
    io: "io" extends keyof Meta ? IO : never;
  }

  export interface Execution<Stream, Return, Deps, Params = null>
    extends AsyncGenerator<Stream, Return, Deps>, Promise<Return> {
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

  export interface EventKind<Name extends string, Data, Meta = null>
    extends Resource<Name>, Attributable<Meta> {
    emit(
      data: Data,
    ): AsyncGenerator<Event<Name, Data>, Event<Name, Data>, unknown>;
  }

  export type Type<Name extends string, Type, Scope = {}> = ArkType<Type, Scope> &
    Resource<Name>
    

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface Triggerable<Ctx extends Record<any, any>> {
    on<const Schema>(
      trigger: ValidateTrigger<Schema>,
    ): Contextual<Ctx & InferTriggerScope<Schema>>;
  }

  export interface ResourceKind<Name extends string> extends Named<Name> {}
}
