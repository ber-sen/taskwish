export type Context = Ctx;

export type CtxInput = Ctx | { abortSignal?: AbortSignal } | AbortSignal;

function isAbortSignal(value: unknown): value is AbortSignal {
  return value instanceof AbortSignal;
}

export class Ctx {
  readonly abortSignal: AbortSignal;

  constructor(context: CtxInput = {}) {
    const abortSignal = isAbortSignal(context)
      ? context
      : isAbortSignal(context.abortSignal)
      ? context.abortSignal
      : undefined;

    this.abortSignal = abortSignal ?? new AbortController().signal;
  }

  static new(context: CtxInput = {}): Ctx {
    return context instanceof Ctx ? context : new Ctx(context);
  }
}

export function newContext(context: CtxInput = {}): Ctx {
  return Ctx.new(context);
}
