import { TW } from "../core";
import { PrettyScope, RawEntry, ResolveScope } from "../helpers";

// ── Scope helpers ─────────────────────────────────────────────────────────────

// During the loop the named key holds { item: T; index: number }
type LoopInnerCtx<Ctx extends Record<any, any>, Name extends string, Item> =
  Omit<Ctx, "scope"> & {
    scope: { [K in Name]: RawEntry<{ item: Item; index: number }, []> } & Ctx["scope"];
  };

// After the loop: new keys (not in base, not the loop variable) get ":loop" prepended.
type LoopScope<Base extends Record<any, any>, Added extends Record<any, any>, Name extends string> =
  Base & {
    [K in keyof Added as K extends keyof Base | Name ? never : K]:
      Added[K] extends RawEntry<infer R, infer Ops extends string[]>
        ? RawEntry<R, [":loop", ...Ops]>
        : RawEntry<Added[K], [":loop"]>;
  };

type LoopResult<Ctx extends Record<any, any>, A extends Record<any, any>, Name extends string> = {
  [TW.Type]: "Loop";
  [TW.Step]: (input: Ctx) => {
    name: A["name"];
    steps: A["steps"];
    scope: LoopScope<Ctx["scope"], A["scope"], Name>;
    last: A["last"][];
  };
};

type Items<Ctx extends Record<any, any>> =
  (ctx: TW.Scope<PrettyScope<ResolveScope<Ctx["scope"]>>>) => readonly any[];

// ── Overloads ─────────────────────────────────────────────────────────────────

export interface LoopFn {
  // Unnamed — 1 step
  <Ctx extends Record<any, any>, Is extends readonly any[], A extends Record<any, any>>(
    items: Is | Items<Ctx>,
    step: { [TW.Step]: (input: LoopInnerCtx<Ctx, "loop", NoInfer<Is>[number]>) => A },
  ): LoopResult<Ctx, A, "loop">;

  // Unnamed — 2 steps
  <Ctx extends Record<any, any>, Is extends readonly any[], A extends Record<any, any>, B extends Record<any, any>>(
    items: Is | Items<Ctx>,
    step1: { [TW.Step]: (input: LoopInnerCtx<Ctx, "loop", NoInfer<Is>[number]>) => A },
    step2: { [TW.Step]: (input: A) => B },
  ): LoopResult<Ctx, B, "loop">;

  // Unnamed — 3 steps
  <Ctx extends Record<any, any>, Is extends readonly any[], A extends Record<any, any>, B extends Record<any, any>, C extends Record<any, any>>(
    items: Is | Items<Ctx>,
    step1: { [TW.Step]: (input: LoopInnerCtx<Ctx, "loop", NoInfer<Is>[number]>) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): LoopResult<Ctx, C, "loop">;

  // Named — 1 step
  <const Name extends string, Ctx extends Record<any, any>, Is extends readonly any[], A extends Record<any, any>>(
    name: Name,
    items: Is | Items<Ctx>,
    step: { [TW.Step]: (input: LoopInnerCtx<Ctx, Name, NoInfer<Is>[number]>) => A },
  ): LoopResult<Ctx, A, Name>;

  // Named — 2 steps
  <const Name extends string, Ctx extends Record<any, any>, Is extends readonly any[], A extends Record<any, any>, B extends Record<any, any>>(
    name: Name,
    items: Is | Items<Ctx>,
    step1: { [TW.Step]: (input: LoopInnerCtx<Ctx, Name, NoInfer<Is>[number]>) => A },
    step2: { [TW.Step]: (input: A) => B },
  ): LoopResult<Ctx, B, Name>;

  // Named — 3 steps
  <const Name extends string, Ctx extends Record<any, any>, Is extends readonly any[], A extends Record<any, any>, B extends Record<any, any>, C extends Record<any, any>>(
    name: Name,
    items: Is | Items<Ctx>,
    step1: { [TW.Step]: (input: LoopInnerCtx<Ctx, Name, NoInfer<Is>[number]>) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): LoopResult<Ctx, C, Name>;

  Range(start: number, end: number): number[];
}

export const Loop: LoopFn = Object.assign(
  function Loop(...args: unknown[]): never {
    const hasName = typeof args[0] === "string";
    const name = hasName ? (args[0] as string) : "loop";
    const items = hasName ? args[1] : args[0];
    const steps = hasName ? args.slice(2) : args.slice(1);
    return { [TW.Type]: "Loop", name, items, steps } as never;
  },
  {
    Range(start: number, end: number): number[] {
      return Array.from({ length: end - start }, (_, i) => start + i);
    },
  },
) as LoopFn;
