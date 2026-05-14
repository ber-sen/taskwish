import { TW } from "../core";
import { PrettyScope } from "../helpers";

type Truthy<T> = T extends false | "" | 0 | null | undefined ? never : T;

// Scope after If: new keys from the branch become optional
type IfScope<Base extends Record<any, any>, Added extends Record<any, any>> =
  Base & Partial<Omit<Added, keyof Base>>;

// Scope after Else: keys that were optional from If + present in Else become required (union of both values)
type ElseScope<IfCtxScope extends Record<any, any>, ElseAdded extends Record<any, any>> = {
  [K in keyof IfCtxScope | keyof ElseAdded]:
    K extends keyof IfCtxScope
      ? K extends keyof ElseAdded
        ? undefined extends IfCtxScope[K]
          ? Exclude<IfCtxScope[K], undefined> | ElseAdded[K]
          : IfCtxScope[K]
        : IfCtxScope[K]
      : K extends keyof ElseAdded
        ? ElseAdded[K] | undefined
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

export function If<
  Ctx extends Record<any, any>,
  const Condition,
  A extends Record<any, any>,
>(
  condition: ((scope: TW.Scope<PrettyScope<Ctx["scope"]>>) => Condition) | Condition,
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
  condition: ((scope: TW.Scope<PrettyScope<Ctx["scope"]>>) => Condition) | Condition,
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
