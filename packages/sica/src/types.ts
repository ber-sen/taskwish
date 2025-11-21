import { type } from "arktype";
import { StandardSchemaV1 } from "@standard-schema/spec";
import {
  ActionInput,
  ActionReturn,
  RunnableReturn,
  UUIDv7String,
  UUIDv5String,
} from "./helpers";

export namespace Boria {
  export type ThreadId = UUIDv5String | UUIDv7String;

  export type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

  export interface TextPart {
    type: "text";
    text: string;
  }

  export interface ImagePart {
    type: "image";
    image: DataContent | URL;
    mediaType?: string;
  }

  export interface FilePart {
    type: "file";
    data: DataContent | URL;
    filename?: string;
    mediaType: string;
  }

  export type UserContent = string | Array<TextPart | ImagePart | FilePart>;

  export interface ReasoningPart {
    type: "reasoning";
    text: string;
  }

  export type AssistantContent =
    | string
    | Array<TextPart | FilePart | ReasoningPart>;

  export type System = {
    role: "system";
    content: string;
  };

  export type User = {
    role: "user";
    user?: string;
    content: UserContent;
  };

  export type Assistant = {
    role: "assistant";
    content: AssistantContent;
  };

  export interface Message<
    Type extends (User | System | Assistant) & { meta?: any },
    Attributes = null,
  > {
    attr<
      Attr extends {
        redirectThreadId?: ThreadId;
        finalizeThread?: boolean;
      },
    >(
      attr: Attributes extends object ? "get" : Attr
    ): Attributes extends object ? Attributes : Message<Type, Attr>;
    role: Type["role"];
    content: Type["content"];
  }

  export interface Thread {
    id: ThreadId;
    actorId: UUIDv5String | UUIDv7String | string;
    state: "new" | "active" | "waiting" | "finalized" | "renewed";
    messages: Boria.AnyMessage[];
  }

  export type AnyMessage = Message<any, any>;
}

export namespace Sica {
  export const Type = Symbol.for("Sica.type");

  export const Deploy = Symbol.for("Sica.Deploy");

  export const Destroy = Symbol.for("Sica.down");

  export interface Typed<Type extends string[]> {
    [Type]: Type;
  }

  export interface Attributable {
    attr(attributes: unknown): unknown;
  }

  export interface Struct<Data, Type extends string[]> extends Typed<Type> {
    data: Data;
  }

  export interface Resource<Type extends string[]> extends Typed<Type> {
    id: UUIDv5String;
    [Deploy](): AsyncGenerator<Boria.AnyMessage, boolean, unknown>;
    [Destroy](): AsyncGenerator<Boria.AnyMessage, boolean, unknown>;
  }

  export interface NullaryAction<
    Handler extends () => any,
    Type extends string[] = ["action"],
  > extends Resource<Type> {
    <const Scope extends Record<string, any>>(
      scope?: Scope
    ): RunnableReturn<Handler>; // get deps of scope from handler
  }

  export interface Action<
    Handler extends ((...args: any) => any) | GenericHandler,
    Type extends string[] = ["action"],
  > extends Resource<Type> {
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
    id: UUIDv7String;
    actorId: UUIDv5String;
    threadId: Boria.ThreadId;
    params: Params;
  }

  export interface Event<Data, Type extends string[]> extends Typed<Type> {
    id: UUIDv7String;
    actorId: UUIDv5String;
    threadId: Boria.ThreadId;
    handled?: boolean;
    data: Data;
  }

  export interface Use<Dep extends Typed<any>> {
    dep: Dep;
  }

  export interface Provide<Dep extends Typed<any>> {
    dep: Dep;
  }

  export interface Log<Data, Type extends string[] = ["info"]> // info, start, warn, success
    extends Typed<Type> {
    id: UUIDv7String;
    threadId: Boria.ThreadId;
    data: Data;
    toString: () => string;
  }

  export interface Exception<
    Status extends number,
    Data,
    Type extends string[] = ["error"], // error, critical
  > extends Typed<Type> {
    id: UUIDv7String;
    threadId: Boria.ThreadId;
    status: Status;
    data: Data;
    throw: () => void;
    toString: () => string;
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

  export interface EventKind<
    Data,
    Type extends string[] = ["event"],
    Attributes = null,
  > extends Resource<Type>,
      Attributable {
    attr<Attr extends { threadId: keyof Data; scope?: Record<string, any> }>(
      attr: Attributes extends object ? "get" : Attr
    ): Attributes extends object ? Attributes : EventKind<Data, Type, Attr>;
    (data: Data): AsyncGenerator<Event<Data, Type>, Event<Data, Type>, unknown>;
  }

  export type Step<
    Name extends string,
    Result,
    Type extends string[] = ["step"],
    Attributes extends { executionId: UUIDv5String } | null = null,
  > = {
    [P in Name]: Result & Typed<Type>;
  } & {
    attr: (param: "get") => Attributes;
  };

  export interface Scoped<Scope extends Record<any, any>> {
    scope: Scope;
  }

  export type ValidateSchema<Schema> =
    Schema extends StandardSchemaV1<any>
      ? Schema
      : Schema extends object
        ? type.validate<Schema>
        : object;

  export type InferInput<Schema> =
    Schema extends StandardSchemaV1<infer Input>
      ? Input
      : type.instantiate<Schema>["infer"];

  export type ValidateTrigger<Schema> =
    Schema extends StandardSchemaV1<any>
      ? Schema
      : Schema extends object
        ? type.validate<Schema>
        : Schema extends EventKind<any, infer Input>
          ? EventKind<any, Input>
          : object;

  export type InferTrigger<Schema> =
    Schema extends StandardSchemaV1<infer Input>
      ? { input: Input; threadId: Boria.ThreadId }
      : Schema extends Event<infer Input, any>
        ? { input: Input; threadId: Boria.ThreadId }
        : {
            input: type.instantiate<Schema>["infer"];
            threadId: Boria.ThreadId;
          };

  export interface Extendable<Scope> {
    use<const NewScope>(newScope: NewScope): Extendable<Scope & NewScope>;
  }

  export interface StepOption<T extends string, G extends null | string> {
    stepOptionType: T;
    group: G;
    params?: object;
  }

  export interface Triggerable<Scope extends Record<any, any>> {
    on<const Schema>(
      trigger: ValidateTrigger<Schema>
    ): Scoped<Scope & InferTrigger<Schema>>;
  }
}
