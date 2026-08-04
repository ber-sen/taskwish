import { TW } from "../core";
import { PrettyScope, RawEntry, ResolveScope } from "../helpers";
import { ResultKind } from "./hkt";
import { Steps, SubSteps } from "./steps";

// ── Scope helpers ─────────────────────────────────────────────────────────────

// IfScope: new keys get ":if" prepended to their operator stack.
// Existing keys that were already conditional (":if" at front) get their result
// unioned — this correctly handles ElseIf setting the same key as a prior If.
type IfScope<Base extends Record<any, any>, Added extends Record<any, any>> = {
  [K in keyof Base | keyof Added]: K extends keyof Base
    ? K extends keyof Added
      ? Base[K] extends RawEntry<
          infer BR,
          [":if", ...infer RestOps extends string[]],
          infer BY
        >
        ? Added[K] extends RawEntry<infer AR, any, infer AY>
          ? RawEntry<BR | AR, [":if", ...RestOps], BY | AY>
          : Base[K]
        : Base[K]
      : Base[K]
    : K extends keyof Added
    ? Added[K] extends RawEntry<infer R, infer Ops extends string[], infer Y>
      ? RawEntry<R, [":if", ...Ops], Y>
      : RawEntry<Added[K], [":if"], never>
    : never;
};

// ElseScope: for keys present in both branches, resolves the ":if" by unioning.
// If the Else-side value is itself conditional (e.g., Else contains an inner If),
// the ":if" is kept so the combined result remains optional.
type ElseScope<
  IfCtxScope extends Record<any, any>,
  ElseAdded extends Record<any, any>,
> = {
  [K in keyof IfCtxScope | keyof ElseAdded]: K extends keyof IfCtxScope
    ? K extends keyof ElseAdded
      ? IfCtxScope[K] extends RawEntry<
          infer IfR,
          [":if", ...infer RestOps extends string[]],
          infer IfY
        >
        ? ElseAdded[K] extends RawEntry<
            infer ElseR,
            infer ElseOps extends string[],
            infer ElseY
          >
          ? ElseOps extends [":if", ...string[]]
            ? RawEntry<IfR | ElseR, [":if", ...RestOps], IfY | ElseY>
            : RawEntry<IfR | ElseR, RestOps, IfY | ElseY>
          : IfCtxScope[K]
        : IfCtxScope[K]
      : IfCtxScope[K]
    : K extends keyof ElseAdded
    ? ElseAdded[K] extends RawEntry<
        infer R,
        infer Ops extends string[],
        infer Y
      >
      ? RawEntry<R, [":if", ...Ops], Y>
      : RawEntry<ElseAdded[K], [":if"], never>
    : never;
};

// If didn't run → previous last preserved; if ran → branch last.
// When there is a prior last, we union CR|AR and preserve its ops (no extra ":if" — the
// value is guaranteed to exist).  When there is no prior last, we add ":if" so the
// result is marked as potentially undefined — mirrors IfScope for new keys.
type IfLast<Ctx, A> = "last" extends keyof A
  ? A["last"] extends RawEntry<infer AR, infer AOps extends string[], infer AY>
    ? "last" extends keyof Ctx
      ? Ctx["last"] extends RawEntry<
          infer CR,
          infer COps extends string[],
          infer CY
        >
        ? RawEntry<CR | AR, COps, CY | AY> // prior last exists: union, keep its ops
        : RawEntry<AR, [":if", ...AOps], AY>
      : RawEntry<AR, [":if", ...AOps], AY> // no prior last: mark conditional
    : never
  : "last" extends keyof Ctx
  ? Ctx["last"]
  : RawEntry<never, [], never>;

// Else always runs one branch → resolves the ":if" — mirrors ElseScope.
// When Ctx["last"] carries ":if" (no prior step before the If), strip it on merge.
// When Ctx["last"] has no ":if" (prior step exists), fall back to a plain union.
type ElseLast<Ctx, A> = "last" extends keyof Ctx
  ? Ctx["last"] extends RawEntry<
      infer CR,
      [":if", ...infer RestOps extends string[]],
      infer CY
    >
    ? "last" extends keyof A
      ? A["last"] extends RawEntry<
          infer AR,
          infer AOps extends string[],
          infer AY
        >
        ? AOps extends [":if", ...string[]]
          ? RawEntry<CR | AR, [":if", ...RestOps], CY | AY>
          : RawEntry<CR | AR, RestOps, CY | AY>
        : RawEntry<CR, [":if", ...RestOps], CY>
      : RawEntry<CR, [":if", ...RestOps], CY>
    : Ctx["last"] extends RawEntry<
        infer CR,
        infer COps extends string[],
        infer CY
      >
    ? "last" extends keyof A
      ? A["last"] extends RawEntry<infer AR, any, infer AY>
        ? RawEntry<CR | AR, COps, CY | AY>
        : Ctx["last"]
      : Ctx["last"]
    : Ctx["last"]
  : "last" extends keyof A
  ? A["last"]
  : RawEntry<never, [], never>;

// ── Result types ──────────────────────────────────────────────────────────────

type IfResult<Ctx extends Record<any, any>, Last extends Record<any, any>> = {
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

type ElseResult<Ctx extends Record<any, any>, Last extends Record<any, any>> = {
  [TW.Type]: "Else";
  [TW.Step]: (input: Ctx) => {
    name: Last["name"];
    steps: Last["steps"];
    scope: ElseScope<Ctx["scope"], Last["scope"]>;
    last: ElseLast<Ctx, Last>;
  };
};

// ── Cond ──────────────────────────────────────────────────────────────────────

export type CondNode<Ctx extends Record<any, any> = any, Cond = any> = {
  [TW.Type]: "Cond";
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    step: Ctx["step"];
    scope: Record<"condition", RawEntry<Cond, []>> & Ctx["scope"];
    last: Cond;
  };
  fn: (...args: any[]) => unknown;
};

export function Cond<Ctx extends Record<any, any>, Cond>(
  fn:
    | ((scope: TW.Scope<PrettyScope<ResolveScope<Ctx["scope"]>>>) => Cond)
    | {
        toFn: (
          scope: TW.Scope<PrettyScope<ResolveScope<Ctx["scope"]>>>,
        ) => Cond;
        toJSON: () => unknown;
      },
): CondNode<Ctx, Cond>;
export function Cond(fn: unknown): never {
  return { [TW.Type]: "Cond", fn } as never;
}

// ── HKT kinds ─────────────────────────────────────────────────────────────────

interface IfResultKind extends ResultKind {
  type: this["ctx"] extends Record<any, any>
    ? this["last"] extends Record<any, any>
      ? IfResult<this["ctx"], this["last"]>
      : never
    : never;
}

interface ElseIfResultKind extends ResultKind {
  type: this["ctx"] extends Record<any, any>
    ? this["last"] extends Record<any, any>
      ? ElseIfResult<this["ctx"], this["last"]>
      : never
    : never;
}

interface ElseResultKind extends ResultKind {
  type: this["ctx"] extends Record<any, any>
    ? this["last"] extends Record<any, any>
      ? ElseResult<this["ctx"], this["last"]>
      : never
    : never;
}

// ── If ────────────────────────────────────────────────────────────────────────

export type IfFn = Steps<typeof SubSteps, IfResultKind, "Cond">;

export const If: IfFn = function If(
  condition: unknown,
  ...steps: unknown[]
): never {
  return { [TW.Type]: "If", condition, steps } as never;
} as IfFn;

// ── ElseIf ────────────────────────────────────────────────────────────────────

export type ElseIfFn = Steps<typeof SubSteps, ElseIfResultKind, "Cond">;

export const ElseIf: ElseIfFn = function ElseIf(
  condition: unknown,
  ...steps: unknown[]
): never {
  return { [TW.Type]: "ElseIf", condition, steps } as never;
} as ElseIfFn;

// ── Else ──────────────────────────────────────────────────────────────────────

export type ElseFn = Steps<typeof SubSteps, ElseResultKind>;

export const Else: ElseFn = function Else(...steps: unknown[]): never {
  return { [TW.Type]: "Else", steps } as never;
} as ElseFn;
