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

// ── Overloads ─────────────────────────────────────────────────────────────────

export function If<
  Ctx extends Record<any, any>,
  const Condition,
  A extends Record<any, any>,
>(
  condition: ((scope: TW.Scope<PrettyScope<ResolveScope<Ctx["scope"]>>>) => Condition) | Condition,
  step: { [TW.Step]: (input: Ctx) => A },
): {
  [TW.Type]: "If";
  [TW.Step]: (input: Ctx) => {
    name: A["name"];
    steps: A["steps"];
    scope: IfScope<Ctx["scope"], A["scope"]>;
    last: IfLast<Ctx, A>;
  };
};

export function If(condition: unknown, ...steps: unknown[]): never {
  return { [TW.Type]: "If", condition, steps } as never;
}

export function Else<
  Ctx extends Record<any, any>,
  A extends Record<any, any>,
>(
  step: { [TW.Step]: (input: Ctx) => A },
): {
  [TW.Type]: "Else";
  [TW.Step]: (input: Ctx) => {
    name: A["name"];
    steps: A["steps"];
    scope: ElseScope<Ctx["scope"], A["scope"]>;
    last: ElseLast<Ctx, A>;
  };
};

export function Else(...steps: unknown[]): never {
  return { [TW.Type]: "Else", steps } as never;
}

export function ElseIf<
  Ctx extends Record<any, any>,
  const Condition,
  A extends Record<any, any>,
>(
  condition: ((scope: TW.Scope<PrettyScope<ResolveScope<Ctx["scope"]>>>) => Condition) | Condition,
  step: { [TW.Step]: (input: Ctx) => A },
): {
  [TW.Type]: "ElseIf";
  [TW.Step]: (input: Ctx) => {
    name: A["name"];
    steps: A["steps"];
    scope: IfScope<Ctx["scope"], A["scope"]>;
    last: IfLast<Ctx, A>;
  };
};

export function ElseIf(condition: unknown, ...steps: unknown[]): never {
  return { [TW.Type]: "ElseIf", condition, steps } as never;
}
