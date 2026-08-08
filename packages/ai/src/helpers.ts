
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { type } from "arktype";

type CamelCaseHelper<T extends string> =
  T extends `${infer Left}${infer Delimiter}${infer Right}`
    ? Delimiter extends " " | "_" | "-" | "." | "," | "!"
      ? `${Left}${Capitalize<ToCamelCase<Right>>}`
      : `${Left}${CamelCaseHelper<`${Delimiter}${Right}`>}`
    : T;

type LowercaseFirst<T extends string> =
  T extends `${infer First}${infer Rest}` ? `${Lowercase<First>}${Rest}` : T;

type ToCamelCase<T extends string> = LowercaseFirst<CamelCaseHelper<T>>;

type HasSeparator<S extends string> = S extends `${string}${"_" | "-" | " "}${string}`
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

export type ValidateSchema<Schema, Scope = {}> =
  Schema extends StandardSchemaV1<any> ? Schema : type.validate<Schema, Scope>;

export type InferSchema<Schema, Scope = {}> =
  Schema extends StandardSchemaV1<infer Input>
    ? Input
    : type.instantiate<Schema, Scope>["infer"];
