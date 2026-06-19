import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  bool,
  bytes,
  char,
  f32,
  f64,
  i8,
  i16,
  i32,
  i64,
  i128,
  isize,
  str,
  u8,
  u16,
  u32,
  u64,
  u128,
  usize,
} from "@taskwish/core";
import { type, scope } from "arktype";

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
  Schema extends StandardSchemaV1<any>
    ? Schema
    : type.validate<Schema, WithArkTypeScope<Scope>>;

export type InferSchema<Schema, Scope = {}> =
  Schema extends StandardSchemaV1<infer Input>
    ? Input
    : type.instantiate<Schema, WithArkTypeScope<Scope>>["infer"];

export type ArkTypeScopeDef = {
  i8: type.cast<i8>;
  i16: type.cast<i16>;
  i32: type.cast<i32>;
  i64: type.cast<i64>;
  i128: type.cast<i128>;
  isize: type.cast<isize>;
  u8: type.cast<u8>;
  u16: type.cast<u16>;
  u32: type.cast<u32>;
  u64: type.cast<u64>;
  u128: type.cast<u128>;
  usize: type.cast<usize>;
  f32: type.cast<f32>;
  f64: type.cast<f64>;
  bool: type.cast<bool>;
  char: type.cast<char>;
  str: type.cast<str>;
  bytes: type.cast<bytes>;
};

export type ArkTypeScope = scope.infer<ArkTypeScopeDef>;

type WithArkTypeScope<Scope> = Omit<ArkTypeScope, keyof Scope> & Scope;
