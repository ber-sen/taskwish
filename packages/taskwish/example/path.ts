type BuildTuple<L extends number, T extends any[] = []> = T["length"] extends L
  ? T
  : BuildTuple<L, [...T, unknown]>;

type Add<A extends number, B extends number> = [
  ...BuildTuple<A>,
  ...BuildTuple<B>
]["length"];

type Subtract<A extends number, B extends number> = BuildTuple<A> extends [
  ...infer R,
  ...BuildTuple<B>
]
  ? R["length"]
  : never;

type AdjustNumber<T, N extends number> = "lorem" extends keyof T
  ? Add<N, 1>
  : "ipsum" extends keyof T
  ? Subtract<N, 1>
  : N;

type A = { lorem: string };
type B = { ipsum: boolean };
type C = { other: number };

type ResultA = AdjustNumber<B, AdjustNumber<A, 10>>;
type ResultB = AdjustNumber<B, 10>;
type ResultC = AdjustNumber<C, 10>;

type InScope<
  A extends number,
  B extends number,
  Arr extends unknown[] = []
> = Arr["length"] extends B
  ? A extends Arr["length"]
    ? true
    : false
  : Arr["length"] extends A
  ? true
  : InScope<A, B, [unknown, ...Arr]>;

type X = InScope<8, 11> extends true ? string : never;
