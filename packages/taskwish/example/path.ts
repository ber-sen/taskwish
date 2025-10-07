type BuildTuple<L extends number, T extends any[] = []> =
  T['length'] extends L ? T : BuildTuple<L, [...T, any]>;

type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length'];

type Subtract<A extends number, B extends number> =
  BuildTuple<A> extends [...infer Rest, ...BuildTuple<B>] ? Rest['length'] : never;

type AdjustNumber<T, N extends number> =
  T extends object
    ? "lorem" extends keyof T ? Add<N, 1> :
      "ipsum" extends keyof T ? Subtract<N, 1> :
      N
    : N;

type AdjustSequence<Arr extends any[], N extends number = 0> =
  Arr extends [infer Head, ...infer Tail]
    ? AdjustSequence<Tail, Extract<AdjustNumber<Head, N>, number>>
    : N;

type A = { lorem: string };
type B = { ipsum: boolean };
type C = { other: number };

type ResultA = AdjustSequence<[A, B], 0>;

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
