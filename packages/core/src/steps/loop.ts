import { TW } from "../core";
import { PrettyScope, RawEntry, ResolveScope } from "../helpers";

// ── Scope helpers ─────────────────────────────────────────────────────────────

// After the loop: keys added inside (not already in Base) get ":loop" prepended.
type LoopScope<
  Base extends Record<any, any>,
  Added extends Record<any, any>,
> = Base & {
  [K in keyof Added as K extends keyof Base
    ? never
    : K]: Added[K] extends RawEntry<infer R, infer Ops extends string[]>
    ? RawEntry<R, [":loop", ...Ops]>
    : RawEntry<Added[K], [":loop"]>;
};

type LoopResult<
  Ctx extends Record<any, any>,
  A extends Record<any, any>,
> = {
  [TW.Type]: "Loop";
  [TW.Step]: (input: Ctx) => {
    name: A["name"];
    steps: A["steps"];
    scope: LoopScope<Ctx["scope"], A["scope"]>;
    last: A["last"][];
  };
};

// ── ForEach ───────────────────────────────────────────────────────────────────

export type ForEachNode<Ctx extends Record<any, any>, Item = any, Name extends string = "loop"> = {
  [TW.Type]: "ForEach";
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    [TW.Step]: Ctx["step"];
    scope: Record<Name, RawEntry<{ item: Item; index: number }, []>> & Ctx["scope"];
    last: Ctx["last"];
  };
  loopName: Name;
  fn: (...args: any[]) => any;
};

export function ForEach<Ctx extends Record<any, any>, Item, Name extends string>(
  name: Name,
  fn: (scope: TW.Scope<PrettyScope<ResolveScope<Ctx["scope"]>>>) => readonly Item[],
): ForEachNode<Ctx, Item, Name>;

export function ForEach<Ctx extends Record<any, any>, Name extends string>(
  name: Name,
  options: { range: readonly [number, number] },
): ForEachNode<Ctx, number, Name>;

export function ForEach<Ctx extends Record<any, any>, const Item, Name extends string>(
  name: Name,
  items: readonly Item[],
): ForEachNode<Ctx, Item, Name>;

export function ForEach<Ctx extends Record<any, any>, Item>(
  fn: (scope: TW.Scope<PrettyScope<ResolveScope<Ctx["scope"]>>>) => readonly Item[],
): ForEachNode<Ctx, Item>;

export function ForEach<Ctx extends Record<any, any>>(
  options: { range: readonly [number, number] },
): ForEachNode<Ctx, number>;

export function ForEach<Ctx extends Record<any, any>, const Item>(
  items: readonly Item[],
): ForEachNode<Ctx, Item>;

export function ForEach(...args: unknown[]): never {
  const [first, second] = args;
  if (typeof first === "string") {
    const fn = toFn(second);
    return { [TW.Type]: "ForEach", loopName: first, fn } as never;
  }
  const fn = toFn(first);
  return { [TW.Type]: "ForEach", loopName: "loop", fn } as never;
}

function toFn(v: unknown): () => unknown[] {
  if (Array.isArray(v)) return () => v;
  if (v !== null && typeof v === "object" && "range" in (v as object)) {
    const [from, to] = (v as { range: [number, number] }).range;
    return () => Array.from({ length: to - from }, (_, i) => from + i);
  }
  return v as () => unknown[];
}

// ── Overloads ─────────────────────────────────────────────────────────────────

export interface LoopFn {
  // ForEach + 1 step
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
  >(
    input: { [TW.Type]: "ForEach"; [TW.Step]: (input: Ctx) => A },
    step: { [TW.Step]: (input: A) => B },
  ): LoopResult<Ctx, B>;

  // ForEach + 2 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
  >(
    input: { [TW.Type]: "ForEach"; [TW.Step]: (input: Ctx) => A },
    step1: { [TW.Step]: (input: A) => B },
    step2: { [TW.Step]: (input: B) => C },
  ): LoopResult<Ctx, C>;

  // ForEach + 3 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
    D extends Record<any, any>,
  >(
    input: { [TW.Type]: "ForEach"; [TW.Step]: (input: Ctx) => A },
    step1: { [TW.Step]: (input: A) => B },
    step2: { [TW.Step]: (input: B) => C },
    step3: { [TW.Step]: (input: C) => D },
  ): LoopResult<Ctx, D>;
}

export const Loop: LoopFn = function Loop(...args: unknown[]): never {
  const first = args[0];
  const loopName =
    first !== null &&
    typeof first === "object" &&
    (first as any)[TW.Type] === "ForEach"
      ? (first as any).loopName ?? "loop"
      : "loop";
  const items = first;
  const steps = args.slice(1);
  return { [TW.Type]: "Loop", name: loopName, items, steps } as never;
} as LoopFn;
