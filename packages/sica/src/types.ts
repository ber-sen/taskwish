import { type } from "arktype";
import { StandardSchemaV1 } from "@standard-schema/spec";
import {
  ActionInput,
  ActionReturn,
  DeepOptionalString,
  RunnableReturn,
  UUIDv7String,
  UUIDv5String,
} from "./helpers";

export namespace SicaMessage {
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

  type AssistantContent = string | Array<TextPart | FilePart | ReasoningPart>;

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

  export type Message = User | System | Assistant;
}

export namespace Sica {
  export const TYPE = Symbol.for("Sica.type");

  export const META = Symbol.for("Sica.meta");

  export const UP = Symbol.for("Sica.up");

  export const DOWN = Symbol.for("Sica.down");

  export interface Typed<Type extends string[]> {
    [TYPE]: Type;
  }
  export interface Struct<Data, Type extends string[]> extends Typed<Type> {
    data: Data;
  }

  export interface Resource<Type extends string[]> extends Typed<Type> {
    id: UUIDv5String;
    [UP](): AsyncGenerator<string, boolean, unknown>;
    [DOWN](): AsyncGenerator<string, boolean, unknown>;
  }

  export interface NullaryAction<
    Handler extends () => any,
    Type extends string[] = ["action"],
  > extends Resource<Type> {
    [META]: {
      handler: Handler;
    };
    <const Scope extends Record<string, any>>(
      scope?: Scope
    ): RunnableReturn<Handler>; // get deps of scope from handler
  }

  export interface Thread {
    id: UUIDv5String | UUIDv7String;
    state: "new" | "active" | "waiting" | "finalized" | "renewed";
    messages: SicaMessage.Message[]
  }

  export interface Action<
    Handler extends ((...args: any) => any) | GenericHandler,
    Type extends string[] = ["action"],
  > extends Resource<Type> {
    [META]: {
      handler: Handler;
    };
    <const Scope extends Record<string, any>>(
      params: ActionInput<Handler>,
      scope?: Scope
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
    threadId: UUIDv5String | UUIDv7String;
    parentId?: UUIDv7String;
    params: Params;
  }

  export interface Event<Data, Type extends string[]> extends Typed<Type> {
    id: UUIDv7String;
    actorId: UUIDv5String;
    threadId: UUIDv5String | UUIDv7String;
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
    data: Data;
    toString: () => string;
  }

  export interface Exception<
    Status extends number,
    Data,
    Type extends string[] = ["error"], // error, critical
  > extends Typed<Type> {
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

  export interface EventKind<Data, Type extends string[] = ["event"]>
    extends Resource<Type>,
      Describable<
        {
          data: DeepOptionalString<Data>;
        },
        EventKind<Data, Type>
      > {
    thread<const Key extends keyof Data>(
      key: Key
    ): EventKind<Data, Key extends string ? [...Type, `:@${Key}`] : Type>;
    (data: Data): AsyncGenerator<Event<Data, Type>, Event<Data, Type>, unknown>;
  }

  export type Step<
    Name extends string,
    Result,
    Params = null,
    Type extends string[] = ["step"],
  > = {
    [P in Name]: Result & { [META]: { params: Params } } & Typed<Type>;
  };

  export interface Scoped<Scope extends Record<any, any>> {
    scope: Scope;
  }

  export type ValidateTrigger<Schema, Type extends string[] = []> =
    Schema extends StandardSchemaV1<any>
      ? Schema
      : Schema extends object
        ? type.validate<
            Schema,
            {
              "Scope.model": string;
            }
          >
        : Schema extends EventKind<Type, infer Input>
          ? EventKind<Type, Input>
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
      : Schema extends Event<infer Input, any>
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
    on<const Type extends string[], const Schema>(
      trigger: ValidateTrigger<Schema, Type>
    ): Scoped<
      Scope &
        Record<"input", InferInput<Schema>> &
        Record<"threadId", UUIDv5String | UUIDv7String>
    >;
  }
}
