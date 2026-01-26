import {
  UUIDv7String,
  UUIDv5String,
  ValidateTrigger,
  InferTriggerScope,
} from "./helpers";
import { Boria } from "../../message";

export namespace Taskwish {
  export const Name = Symbol.for("Taskwish.Name");

  export const Meta = Symbol.for("Taskwish.Meta");

  export const Scope = Symbol.for("Taskwish.Scope");

  export const Traits = Symbol.for("Taskwish.Traits");

  export interface Scoped<Scope> {
    [Scope]: Scope;
  }

  export interface Named<Name extends string> {
    [Name]: Name;
  }

  export interface Attributable<Meta> {
    [Meta]: Meta;
  }

  export interface Resource<Name extends string> extends Named<Name> {
    id: UUIDv5String;
  }

  export abstract class Handler {
    readonly ctx!: Record<"model", unknown>;
    run?: (...x: never[]) => Promise<any>;
  }

  export type Scope<Scope> = Scope & {
    <T>(Cls: new (...args: any[]) => T): T;
  };

  export abstract class HasTraits {
    public [Traits]: Array<any> = [];
    static [Symbol.hasInstance](obj: any) {
      return Boolean(obj?.traits?.has?.(this));
    }
  }

  export type Inject<Type> = Type | null;

  export type Action<
    Name extends string,
    Handler extends (...args: any) => any,
    Meta = null,
  > = NoInfer<Handler> & Named<Name> & Attributable<Meta>;

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

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface Triggerable<Scope extends Record<any, any>> {
    on<const Schema>(
      trigger: ValidateTrigger<Schema>,
    ): Scoped<Scope & InferTriggerScope<Schema>>;
  }
}
