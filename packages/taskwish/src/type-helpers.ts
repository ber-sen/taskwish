export type Expect<T extends true> = T;

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? true
  : false;

export type CamelCase<T extends string> =
  T extends `${infer Left}${infer Delimiter}${infer Right}`
    ? Delimiter extends " " | "_" | "-" | "." | "," | "!"
      ? `${Left}${Capitalize<ToCamelCase<Right>>}`
      : `${Left}${CamelCase<`${Delimiter}${Right}`>}`
    : T;

export type LowercaseFirst<T extends string> = T extends `${infer First}${infer Rest}`
  ? `${Lowercase<First>}${Rest}`
  : T;

export type ToCamelCase<T extends string> = LowercaseFirst<CamelCase<T>>;

export type PrettyScope<T> = {
  [K in keyof T as ToCamelCase<Extract<K, string>>]: T[K];
} & {};
