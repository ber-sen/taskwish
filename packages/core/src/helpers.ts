import { Type, type, validateDefinition } from "arktype";
import { StandardSchemaV1 } from "@standard-schema/spec";
import { TW } from "./core";

export type Expect<T extends true> = T;

export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

export type CamelCaseHelper<T extends string> =
  T extends `${infer Left}${infer Delimiter}${infer Right}`
    ? Delimiter extends " " | "_" | "-" | "." | "," | "!"
      ? `${Left}${Capitalize<ToCamelCase<Right>>}`
      : `${Left}${CamelCaseHelper<`${Delimiter}${Right}`>}`
    : T;

export type LowercaseFirst<T extends string> =
  T extends `${infer First}${infer Rest}` ? `${Lowercase<First>}${Rest}` : T;

export type UppercaseFirst<T extends string> =
  T extends `${infer First}${infer Rest}` ? `${Uppercase<First>}${Rest}` : T;

export type ToCamelCase<T extends string> = LowercaseFirst<CamelCaseHelper<T>>;

export type ToCapitalCase<T extends string> = UppercaseFirst<
  CamelCaseHelper<T>
>;

export type PrettyScope<T> = {
  [K in keyof T as 0 extends 1 & T[K]
    ? Extract<K, string>
    : T[K] extends Type<any>
      ? Extract<K, string>
      : Extract<K, string>]: T[K];
} & {};

export type Pretty<T> = { [K in keyof T]: T[K] } & {};

// ── Scope operator machinery ──────────────────────────────────────────────────

export type RawEntry<R, Ops extends string[] = []> = { result: R; operator: Ops };

type AddOp<Op extends string, T> =
  T extends string[]
    ? [Op, ...T]
    : T extends object
      ? { [K in keyof T]: AddOp<Op, T[K]> }
      : T;

type RemoveEndOps<
  T extends readonly string[],
  A extends string[] = [],
> = T extends [infer H extends string, ...infer Rest extends string[]]
  ? H extends ":end"
    ? RemoveEndOps<Rest, A extends [...infer X extends string[], any] ? X : []>
    : RemoveEndOps<Rest, [...A, H]>
  : A;

type ApplyOps<O extends readonly string[], R> =
  O extends [...infer Rest extends string[], infer Last extends string]
    ? Last extends ":loop"
      ? ApplyOps<Rest, R[]>
      : Last extends ":if"
        ? ApplyOps<Rest, R | undefined>
        : ApplyOps<Rest, R>
    : R;

export type ResolveScope<T> = Pretty<{
  [K in keyof T]: T[K] extends { result: infer R; operator: infer O extends string[] }
    ? ApplyOps<RemoveEndOps<O>, R>
    : T[K];
}>;

export type ResolveLast<T> =
  T extends { result: infer R; operator: infer O extends string[] }
    ? ApplyOps<RemoveEndOps<O>, R>
    : T;

export type DeepOptionalString<T> = {
  [K in keyof T]?: T[K] extends object ? DeepOptionalString<T[K]> : string;
};

export async function standardValidate<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>,
): Promise<StandardSchemaV1.InferOutput<T>> {
  let result = schema["~standard"].validate(input);
  if (result instanceof Promise) result = await result;

  // if the `issues` field exists, the validation failed
  if (result.issues) {
    throw new Error(JSON.stringify(result.issues, null, 2));
  }

  return result.value;
}

export type UUIDv7String = `${string}-${string}-7${string}-${string}-${string}`;

export type UUIDv5String = `${string}-${string}-5${string}-${string}-${string}`;

export type ValidateSchema<Schema, Scope = {}> =
  Schema extends StandardSchemaV1<any> ? Schema : type.validate<Schema, Scope>;

export type InferSchema<Schema, Scope = {}> =
  Schema extends StandardSchemaV1<infer Input>
    ? Input
    : type.instantiate<Schema, Scope>["infer"];

export type ValidateTrigger<Schema> =
  Schema extends TW.EventKind<any, infer Input>
    ? TW.EventKind<any, Input>
    : Schema extends TW.Event<any, infer Input>
      ? TW.Event<any, Input>
      : Schema extends StandardSchemaV1<any>
        ? Schema
        : Schema extends object
          ? type.validate<Schema>
          : object;

export type InferTriggerScope<Schema> =
  Schema extends StandardSchemaV1<infer Input>
    ? { input: Input; event: TW.Event<"Command", Input> }
    : Schema extends TW.Event<infer Name, infer Input>
      ? {
          input: Input;
          event: TW.Event<Name, Input>;
        }
      : Schema extends TW.EventKind<infer Name, infer Input>
        ? {
            input: Input;
            event: TW.Event<Name, Input>;
          }
        : type.instantiate<Schema>["infer"] extends Record<any, never>
          ? {
              input: Schema;
              event: TW.Event<"Command", Schema>;
            }
          : {
              input: type.instantiate<Schema>["infer"];
              event: TW.Event<"Command", type.instantiate<Schema>["infer"]>;
            };

export type Apply<
  F extends TW.Handler,
  ctx extends Record<any, any>,
> = NonNullable<
  (F & {
    readonly ctx: ctx;
  })["run"]
>;

const Fail = Symbol("Fail");

export type Fail<Message extends string> = Message;

type Separator = "_" | "-" | " ";

type HasSeparator<S extends string> = S extends `${string}${Separator}${string}`
  ? true
  : false;

type CamelCaseError<S extends string> =
  HasSeparator<S> extends true
    ? ["Expected camelCase string", "Remove separators from:", S]
    : S extends Uncapitalize<S>
      ? never
      : ["Expected camelCase string", "String must start with lowercase:", S];

export type CamelCase<S extends string> =
  CamelCaseError<S> extends never ? S : CamelCaseError<S>;

export type PascalCase<S extends string> =
  HasSeparator<S> extends true
    ? Fail<`Expected PascalCase string, got separator in "${S}"`>
    : S extends Capitalize<S>
      ? S
      : Fail<`Expected PascalCase string, "${S}" must start with uppercase`>;
