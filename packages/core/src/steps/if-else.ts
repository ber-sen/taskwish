import { TW } from "../core";
import { PrettyScope, RawEntry, ResolveScope } from "../helpers";

// ── Scope helpers ─────────────────────────────────────────────────────────────

// IfScope: new keys get ":if" prepended to their operator stack.
// Existing keys that were already conditional (":if" at front) get their result
// unioned — this correctly handles ElseIf setting the same key as a prior If.
type IfScope<Base extends Record<any, any>, Added extends Record<any, any>> = {
  [K in keyof Base | keyof Added]:
    K extends keyof Base
      ? K extends keyof Added
        ? Base[K] extends RawEntry<infer BR, [":if", ...infer RestOps extends string[]]>
          ? Added[K] extends RawEntry<infer AR, any>
            ? RawEntry<BR | AR, [":if", ...RestOps]>
            : Base[K]
          : Base[K]
        : Base[K]
      : K extends keyof Added
        ? Added[K] extends RawEntry<infer R, infer Ops extends string[]>
          ? RawEntry<R, [":if", ...Ops]>
          : RawEntry<Added[K], [":if"]>
        : never;
};

// ElseScope: for keys present in both branches, resolves the ":if" by unioning.
// If the Else-side value is itself conditional (e.g., Else contains an inner If),
// the ":if" is kept so the combined result remains optional.
type ElseScope<IfCtxScope extends Record<any, any>, ElseAdded extends Record<any, any>> = {
  [K in keyof IfCtxScope | keyof ElseAdded]:
    K extends keyof IfCtxScope
      ? K extends keyof ElseAdded
        ? IfCtxScope[K] extends RawEntry<infer IfR, [":if", ...infer RestOps extends string[]]>
          ? ElseAdded[K] extends RawEntry<infer ElseR, infer ElseOps extends string[]>
            ? ElseOps extends [":if", ...string[]]
              ? RawEntry<IfR | ElseR, [":if", ...RestOps]>
              : RawEntry<IfR | ElseR, RestOps>
            : IfCtxScope[K]
          : IfCtxScope[K]
        : IfCtxScope[K]
      : K extends keyof ElseAdded
        ? ElseAdded[K] extends RawEntry<infer R, infer Ops extends string[]>
          ? RawEntry<R, [":if", ...Ops]>
          : RawEntry<ElseAdded[K], [":if"]>
        : never;
};

// If didn't run → previous last preserved; if ran → branch last
type IfLast<Ctx, A> =
  ("last" extends keyof Ctx ? Ctx["last"] : undefined) |
  ("last" extends keyof A ? A["last"] : never);

// Else always runs one branch → union of all If-branch lasts (minus undefined) with Else last
type ElseLast<Ctx, A> =
  ("last" extends keyof Ctx ? Exclude<Ctx["last"], undefined> : never) |
  ("last" extends keyof A ? A["last"] : never);

// ── Result types ──────────────────────────────────────────────────────────────

type IfResult<
  Ctx extends Record<any, any>,
  Last extends Record<any, any>,
> = {
  [TW.Type]: "If";
  [TW.Step]: (input: Ctx) => {
    name: Last["name"];
    steps: Last["steps"];
    scope: IfScope<Ctx["scope"], Last["scope"]>;
    last: IfLast<Ctx, Last>;
  };
};

type ElseIfResult<
  Ctx extends Record<any, any>,
  Last extends Record<any, any>,
> = {
  [TW.Type]: "ElseIf";
  [TW.Step]: (input: Ctx) => {
    name: Last["name"];
    steps: Last["steps"];
    scope: IfScope<Ctx["scope"], Last["scope"]>;
    last: IfLast<Ctx, Last>;
  };
};

type ElseResult<
  Ctx extends Record<any, any>,
  Last extends Record<any, any>,
> = {
  [TW.Type]: "Else";
  [TW.Step]: (input: Ctx) => {
    name: Last["name"];
    steps: Last["steps"];
    scope: ElseScope<Ctx["scope"], Last["scope"]>;
    last: ElseLast<Ctx, Last>;
  };
};

// ── Condition ─────────────────────────────────────────────────────────────────

export type ConditionNode<
  Ctx extends Record<any, any> = any,
  Cond = any,
> = {
  [TW.Type]: "Condition";
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    [TW.Step]: Ctx["step"];
    scope: Record<"condition", RawEntry<Cond, []>> & Ctx["scope"];
    last: Cond;
  };
  fn: (...args: any[]) => unknown;
};

export function Condition<Ctx extends Record<any, any>, Cond>(
  fn: (scope: TW.Scope<PrettyScope<ResolveScope<Ctx["scope"]>>>) => Cond
): ConditionNode<Ctx, Cond>;
export function Condition(fn: unknown): never {
  return { [TW.Type]: "Condition", fn } as never;
}

// ── If ────────────────────────────────────────────────────────────────────────

export interface IfFn {
  // Condition + 1 step
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
  >(
    condition: { [TW.Type]: "Condition"; [TW.Step]: (ctx: Ctx) => A },
    step: { [TW.Step]: (input: A) => B },
  ): IfResult<Ctx, B>;

  // Condition + 2 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
  >(
    condition: { [TW.Type]: "Condition"; [TW.Step]: (ctx: Ctx) => A },
    step1: { [TW.Step]: (input: A) => B },
    step2: { [TW.Step]: (input: B) => C },
  ): IfResult<Ctx, C>;

  // Condition + 3 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
    D extends Record<any, any>,
  >(
    condition: { [TW.Type]: "Condition"; [TW.Step]: (ctx: Ctx) => A },
    step1: { [TW.Step]: (input: A) => B },
    step2: { [TW.Step]: (input: B) => C },
    step3: { [TW.Step]: (input: C) => D },
  ): IfResult<Ctx, D>;

}

export const If: IfFn = function If(condition: unknown, ...steps: unknown[]): never {
  return { [TW.Type]: "If", condition, steps } as never;
} as IfFn;

// ── ElseIf ────────────────────────────────────────────────────────────────────

export interface ElseIfFn {
  // Condition + 1 step
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
  >(
    condition: { [TW.Type]: "Condition"; [TW.Step]: (ctx: Ctx) => A },
    step: { [TW.Step]: (input: A) => B },
  ): ElseIfResult<Ctx, B>;

  // Condition + 2 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
  >(
    condition: { [TW.Type]: "Condition"; [TW.Step]: (ctx: Ctx) => A },
    step1: { [TW.Step]: (input: A) => B },
    step2: { [TW.Step]: (input: B) => C },
  ): ElseIfResult<Ctx, C>;

  // Condition + 3 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
    D extends Record<any, any>,
  >(
    condition: { [TW.Type]: "Condition"; [TW.Step]: (ctx: Ctx) => A },
    step1: { [TW.Step]: (input: A) => B },
    step2: { [TW.Step]: (input: B) => C },
    step3: { [TW.Step]: (input: C) => D },
  ): ElseIfResult<Ctx, D>;

}

export const ElseIf: ElseIfFn = function ElseIf(condition: unknown, ...steps: unknown[]): never {
  return { [TW.Type]: "ElseIf", condition, steps } as never;
} as ElseIfFn;

// ── Else ──────────────────────────────────────────────────────────────────────

export interface ElseFn {
  // 1 step
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
  >(
    step: { [TW.Step]: (input: Ctx) => A },
  ): ElseResult<Ctx, A>;

  // 2 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
  >(
    step1: { [TW.Step]: (input: Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
  ): ElseResult<Ctx, B>;

  // 3 steps
  <
    Ctx extends Record<any, any>,
    A extends Record<any, any>,
    B extends Record<any, any>,
    C extends Record<any, any>,
  >(
    step1: { [TW.Step]: (input: Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): ElseResult<Ctx, C>;
}

export const Else: ElseFn = function Else(...steps: unknown[]): never {
  return { [TW.Type]: "Else", steps } as never;
} as ElseFn;
