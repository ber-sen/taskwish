import { TW } from "@taskwish/core";

export const SmtDeclarationsTag: unique symbol = Symbol.for(
  "TW.SMT.Declarations",
) as never;

declare const SmtValueTag: unique symbol;

export type SmtSort = "Int" | "Real" | "Bool";

export type SmtDeclaration = {
  name: string;
  sort: SmtSort;
};

export type SmtDeclarations = {
  [SmtDeclarationsTag]: true;
  declarations: SmtDeclaration[];
};

export type Pretty<T> = { [K in keyof T]: T[K] } & {};

export type RawEntry<R, Ops extends string[] = [], Yields = never> = {
  result: R;
  yields: Yields;
  operator: Ops;
};

type RemoveEndOps<
  T extends readonly string[],
  A extends string[] = [],
> = T extends [infer Head extends string, ...infer Rest extends string[]]
  ? Head extends ":end"
    ? RemoveEndOps<
        Rest,
        A extends [...infer Init extends string[], any] ? Init : []
      >
    : RemoveEndOps<Rest, [...A, Head]>
  : A;

type ApplyOps<Ops extends readonly string[], R> = Ops extends [
  ...infer Rest extends string[],
  infer Last extends string,
]
  ? Last extends ":loop"
    ? ApplyOps<Rest, R[]>
    : Last extends ":if"
      ? ApplyOps<Rest, R | undefined>
      : ApplyOps<Rest, R>
  : R;

export type ResolveScope<T> = Pretty<{
  [K in keyof T]: T[K] extends {
    result: infer R;
    operator: infer Ops extends string[];
  }
    ? ApplyOps<RemoveEndOps<Ops>, R>
    : T[K];
}>;

export type PrettyScope<T> = {
  [K in keyof T as Extract<K, string>]: T[K];
} & {};

export type UserScope<Ctx extends Record<any, any>> = TW.Scope<
  PrettyScope<ResolveScope<Ctx["scope"]>>
>;

type SmtValue<Sort extends SmtSort, Value> = Value & {
  readonly [SmtValueTag]: Sort;
};

type SmtSortValue<Sort extends SmtSort> = Sort extends "Bool"
  ? boolean
  : number;

type SmtValueSort<T> = T extends {
  readonly [SmtValueTag]: infer Sort extends SmtSort;
}
  ? Sort
  : never;

type UnwrapSmtValue<T> = SmtValueSort<T> extends infer Sort extends SmtSort
  ? SmtSortValue<Sort>
  : never;

export type AddSmtScope<
  Sort extends SmtSort,
  Names extends readonly string[],
> = {
  [Name in Names[number]]: SmtValue<Sort, SmtSortValue<Sort>>;
};

export type StepScopeAdd<ScopeAdd> = {
  [Name in keyof ScopeAdd]: RawEntry<ScopeAdd[Name]>;
};

export type SmtModelScope<Ctx extends Record<any, any>> = Pretty<{
  [Name in keyof ResolveScope<Ctx["scope"]> as ResolveScope<
    Ctx["scope"]
  >[Name] extends {
    readonly [SmtValueTag]: SmtSort;
  }
    ? Extract<Name, string>
    : never]: UnwrapSmtValue<ResolveScope<Ctx["scope"]>[Name]>;
}>;

export type StepResult<
  Ctx extends Record<string, any>,
  ScopeAdd,
  Last,
  Yields = never,
> = {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    step: Ctx["step"];
    scope: StepScopeAdd<ScopeAdd> & Ctx["scope"];
    last: RawEntry<Last, [], Yields>;
    plugins: Ctx["plugins"];
  };
};

export type SolveResult<T> =
  | {
      status: "sat";
      model: T;
    }
  | {
      status: "unsat";
      model: undefined;
    }
  | {
      status: "unknown";
      model: undefined;
      reason: string;
    };

export type Constraint<Scope> = (scope: Scope) => number | boolean;

export type AstNode = {
  type: string;
  name?: string;
  value?: unknown;
  operator?: string;
  left?: AstNode;
  right?: AstNode;
  argument?: AstNode;
  object?: AstNode;
  property?: AstNode;
  computed?: boolean;
  callee?: AstNode;
  arguments?: AstNode[];
};

export type SExpr = string | SExpr[];
