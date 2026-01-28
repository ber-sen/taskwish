import {
  UUIDv7String,
  UUIDv5String,
  ValidateTrigger,
  InferTriggerScope,
} from "./helpers";
import { Taskwish as Message } from "../../message";

export namespace Taskwish {
  export const Id = Symbol.for("Taskwish.Id");

  export const Name = Symbol.for("Taskwish.Name");

  export const Meta = Symbol.for("Taskwish.Meta");

  export const Scope = Symbol.for("Taskwish.Ctx");

  export const Owner = Symbol.for("TaskWish.Owner");

  export interface Contextual<Ctx extends Record<any, any>> {
    [Scope]: Ctx["scope"];
  }

  export interface Named<Name extends string> {
    [Name]: Name;
  }

  export interface Attributable<Meta> {
    [Meta]: Meta;
  }

  export interface Resource<Name extends string> extends Named<Name> {
    [Id]: UUIDv5String;
    [Owner]: string;
  }

  export abstract class Handler {
    readonly ctx!: Record<"model", unknown>;
    run?: (...x: never[]) => Promise<any>;
  }

  export type Scope<Scope> = Scope & {
    get<T>(Cls: new (...args: any[]) => T): T;
  };

  export type Inject<Type> = Type | null;

  export type Action<
    Name extends string,
    Handler extends (...args: any) => any,
    Meta = null,
  > = NoInfer<Handler> & Resource<Name> & Attributable<Meta>;

  export class IO {
    threadId!: Message.ThreadId;
    receiverId!: Message.IdentityId;
    messages!: Message.Message<any, any>[];
    send!: <const Content extends Array<Message.MessagePart<any>> | string>(
      message: Message.Message<Content>,
    ) => Event<"Message", Message.Message<Content>>;
  }

  export interface Event<Name extends string, Data> extends Named<Name> {
    id: Inject<UUIDv7String>;
    io: IO;
    data: Data;
  }

  export interface Execution<Stream, Return, Deps, Params = null>
    extends AsyncGenerator<Stream, Return, Deps>,
      Promise<Return> {
    id: Inject<UUIDv7String>;
    eventId: Inject<UUIDv7String>;
    params: Params;
  }

  export interface Actor<Name extends string> extends Resource<Name> {}

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
    dispatch(
      data: Data,
    ): AsyncGenerator<Event<Name, Data>, Event<Name, Data>, unknown>;
  }

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface Triggerable<Ctx extends Record<any, any>> {
    on<const Schema>(
      trigger: ValidateTrigger<Schema>,
    ): Contextual<Ctx & InferTriggerScope<Schema>>;
  }
}
