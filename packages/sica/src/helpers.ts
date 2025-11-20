import { StandardSchemaV1 } from "@standard-schema/spec";

export type Expect<T extends true> = T;

export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

export type CamelCase<T extends string> =
  T extends `${infer Left}${infer Delimiter}${infer Right}`
    ? Delimiter extends " " | "_" | "-" | "." | "," | "!"
      ? `${Left}${Capitalize<ToCamelCase<Right>>}`
      : `${Left}${CamelCase<`${Delimiter}${Right}`>}`
    : T;

export type LowercaseFirst<T extends string> =
  T extends `${infer First}${infer Rest}` ? `${Lowercase<First>}${Rest}` : T;

export type ToCamelCase<T extends string> = LowercaseFirst<CamelCase<T>>;

export type PrettyScope<T> = {
  [K in keyof T as ToCamelCase<Extract<K, string>>]: T[K];
} & {};

export type Pretty<T> = { [K in keyof T]: T[K] } & {};

export type DeepOptionalString<T> = {
  [K in keyof T]?: T[K] extends object ? DeepOptionalString<T[K]> : string;
};

export async function standardValidate<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>
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

export type RunnableReturn<Handler> = Handler extends () => Generator<
  infer Stream,
  infer Return,
  infer Ctx
>
  ? () => AsyncGenerator<Stream, Return, Ctx> & Promise<Return>
  : Handler extends () => Promise<infer Return>
    ? AsyncGenerator<never, Return, unknown> & Promise<Return>
    : Handler extends () => infer Return
      ? AsyncGenerator<never, Return, unknown> & Promise<Return>
      : never;

export type ActionInput<Handler extends (...args: any) => any> =
  Handler extends (scope: any) => (...args: any) => any
    ? Parameters<ReturnType<Handler>>[0]
    : Parameters<Handler>[0];

export type ActionReturn<Handler> = Handler extends (
  scope: any
) => (...args: any) => Generator<infer Stream, infer Return, infer Ctx>
  ? (
      scope: any
    ) => (...args: any) => AsyncGenerator<Stream, Return, Ctx> & Promise<Return>
  : Handler extends (
        ...args: any
      ) => Generator<infer Stream, infer Return, infer Ctx>
    ? (...args: any) => AsyncGenerator<Stream, Return, Ctx> & Promise<Return>
    : Handler extends (...args: any) => Promise<infer Return>
      ? AsyncGenerator<never, Return, unknown> & Promise<Return>
      : Handler extends (...args: any) => infer Return
        ? AsyncGenerator<never, Return, unknown> & Promise<Return>
        : never;
