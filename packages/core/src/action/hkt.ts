type GenericFunction = (...x: never[]) => unknown;

abstract class HKT {
  readonly model?: unknown;
}

type Apply<F extends HKT, scope extends Record<any, any>> = (F & {
  readonly model: scope["model"];
})

interface DoubleString extends HKT {
  <T extends this["model"]>(x: T): T;
}

type Result = Apply<DoubleString, { model: "gpt" }>;

const a: Result = {} as never;

const b = a("gpt")
