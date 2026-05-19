import { TW } from "../core";
import { PrettyScope, RawEntry, ResolveScope } from "../helpers";

// ── Scope helpers ─────────────────────────────────────────────────────────────

// `loop` is always in scope. When a custom name is given it is also added.
type LoopInnerCtx<Ctx extends Record<any, any>, Name extends string | null, Item> =
  Omit<Ctx, "scope"> & {
    scope: { loop: RawEntry<{ item: Item; index: number }, []> }
      & { [K in Name & string]: RawEntry<{ item: Item; index: number }, []> }
      & Ctx["scope"];
  };

// After the loop: keys added inside (except `loop` and the custom name) get ":loop" prepended.
type LoopScope<Base extends Record<any, any>, Added extends Record<any, any>, Name extends string | null> =
  Base & {
    [K in keyof Added as K extends keyof Base | "loop" | (Name extends null ? never : Name & string) ? never : K]:
      Added[K] extends RawEntry<infer R, infer Ops extends string[]>
        ? RawEntry<R, [":loop", ...Ops]>
        : RawEntry<Added[K], [":loop"]>;
  };

type LoopResult<Ctx extends Record<any, any>, A extends Record<any, any>, Name extends string | null> = {
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

// ── String "this.KEY" path helpers ────────────────────────────────────────────

type ResolvedScopeOf<Ctx extends Record<any, any>> = ResolveScope<Ctx["scope"]>;

// All dot-separated paths to array-typed leaves, up to 10 levels deep.
type ArrayPaths<T, Prefix extends string = "", D extends 1[] = []> =
  D["length"] extends 10 ? never :
  {
    [K in keyof T & string]:
      T[K] extends readonly any[]
        ? `${Prefix}${K}`
        : T[K] extends Record<string, any>
          ? ArrayPaths<T[K], `${Prefix}${K}.`, [...D, 1]>
          : never;
  }[keyof T & string];

// Element type at a dot path (e.g. "words" → string, "foo.bar" → number).
type ElementAtPath<T, Path extends string> =
  Path extends `${infer K}.${infer Rest}`
    ? K extends keyof T ? ElementAtPath<T[K], Rest> : never
    : Path extends keyof T
      ? T[Path] extends readonly (infer Item)[] ? Item : never
      : never;

type ScopeArrayPaths<Ctx extends Record<any, any>> = ArrayPaths<Omit<ResolvedScopeOf<Ctx>, "event">>;
type ScopeElementAt<Ctx extends Record<any, any>, Path extends string> =
  ElementAtPath<ResolvedScopeOf<Ctx>, Path>;

// Infers item type from whichever form was used.
// Path wins when provided; Is falls back to `any` when neither could be inferred.
type LoopItem<Ctx extends Record<any, any>, Is extends readonly any[], Path extends string> =
  [Path] extends [never]
    ? [Is] extends [never[]] ? any : NoInfer<Is>[number]
    : ScopeElementAt<Ctx, Path>;

// ── Overloads ─────────────────────────────────────────────────────────────────

export interface LoopFn {
  // 1 step
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    Is extends readonly any[] = never[],
    const Path extends ScopeArrayPaths<Ctx> = never,
    Name extends string | null = null,
  >(
    input: Is | { name: Name & string; items: Is | Path } | Path,
    step: { [TW.Step]: (input: LoopInnerCtx<Ctx, Name, LoopItem<Ctx, Is, Path>>) => A },
  ): LoopResult<Ctx, A, Name>;

  // 2 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    Is extends readonly any[] = never[],
    const Path extends ScopeArrayPaths<Ctx> = never,
    Name extends string | null = null,
  >(
    input: Is | { name: Name & string; items: Is | Path } | Path,
    step1: { [TW.Step]: (input: LoopInnerCtx<Ctx, Name, LoopItem<Ctx, Is, Path>>) => A },
    step2: { [TW.Step]: (input: A) => B },
  ): LoopResult<Ctx, B, Name>;

  // 3 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
    Is extends readonly any[] = never[],
    const Path extends ScopeArrayPaths<Ctx> = never,
    Name extends string | null = null,
  >(
    input: Is | { name: Name & string; items: Is | Path } | Path,
    step1: { [TW.Step]: (input: LoopInnerCtx<Ctx, Name, LoopItem<Ctx, Is, Path>>) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): LoopResult<Ctx, C, Name>;

  Range(start: number, end: number): number[];
}

export const Loop: LoopFn = Object.assign(
  function Loop(...args: unknown[]): never {
    const first = args[0];
    const isNamed = first !== null && typeof first === "object" && !Array.isArray(first) && "name" in (first as object);
    const name = isNamed ? (first as { name: string }).name : "loop";
    const items = isNamed ? (first as { name: string; items: unknown }).items : first;
    const steps = args.slice(1);
    return { [TW.Type]: "Loop", name, items, steps } as never;
  },
  {
    Range(start: number, end: number): number[] {
      return Array.from({ length: end - start }, (_, i) => start + i);
    },
  },
) as LoopFn;
