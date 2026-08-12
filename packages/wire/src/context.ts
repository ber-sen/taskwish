import { Signal } from "./events";

export type Context = Ctx;

export type CtxInput =
  | Ctx
  | ({ abortSignal?: AbortSignal } & Record<string | symbol, unknown>)
  | AbortSignal;

function isAbortSignal(value: unknown): value is AbortSignal {
  return value instanceof AbortSignal;
}

export class Ctx {
  readonly abortSignal: AbortSignal;
  declare actions?: any;
  declare signal: any;

  constructor(context: CtxInput = {}) {
    const abortSignal = isAbortSignal(context)
      ? context
      : isAbortSignal(context.abortSignal)
      ? context.abortSignal
      : undefined;

    this.abortSignal = abortSignal ?? new AbortController().signal;

    if (!isAbortSignal(context)) {
      const contextRecord = context as Record<string | symbol, unknown>;

      for (const key of Object.keys(contextRecord)) {
        if (key === "abortSignal") continue;
        const value = contextRecord[key];
        if (value === undefined) continue;
        (this as Record<string, unknown>)[key] = value;
      }

      for (const key of Object.getOwnPropertySymbols(contextRecord)) {
        const value = contextRecord[key];
        if (value === undefined) continue;
        (this as Record<symbol, unknown>)[key] = value;
      }
    }

    if (typeof this.signal !== "function") {
      this.signal = <T extends string, D extends Record<string, unknown>>(
        type: T,
        data: D,
      ) => new Signal(type, data);
    }
  }

  static new(context: CtxInput = {}): Ctx {
    return context instanceof Ctx ? context : new Ctx(context);
  }
}

export function createContext(context: CtxInput = {}): Ctx {
  return Ctx.new(context);
}

export function newContext(context: CtxInput = {}): Ctx {
  return Ctx.new(context);
}
