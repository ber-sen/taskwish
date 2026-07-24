import { TW } from "@taskwish/core";

import { collectDeclarations, declareSort } from "./declarations";
import { constraintToSmt } from "./expression";
import { buildSmtScript } from "./script";
import type {
  AddNumberScope,
  Constraint,
  SmtDeclarations,
  SolveResult,
  StepResult,
  UserScope,
} from "./types";
import { solveAllScripts, solveScript } from "./z3";

export function Int<
  Ctx extends Record<string, any>,
  const Names extends readonly [string, ...string[]],
>(...names: Names): StepResult<Ctx, AddNumberScope<Names>, SmtDeclarations> {
  return declareSort("Int", names) as never;
}

export function Real<
  Ctx extends Record<string, any>,
  const Names extends readonly [string, ...string[]],
>(...names: Names): StepResult<Ctx, AddNumberScope<Names>, SmtDeclarations> {
  return declareSort("Real", names) as never;
}

export function Bool<
  Ctx extends Record<string, any>,
  const Names extends readonly [string, ...string[]],
>(
  ...names: Names
): StepResult<Ctx, { [Name in Names[number]]: boolean }, SmtDeclarations> {
  return declareSort("Bool", names) as never;
}

export function Solve<
  const Name extends string,
  Ctx extends Record<string, any>,
  const Constraints extends readonly Constraint<UserScope<Ctx>>[],
>(
  name: Name,
  ...constraints: Constraints
): StepResult<
  Ctx,
  Record<Name, SolveResult<UserScope<Ctx>>>,
  SolveResult<UserScope<Ctx>>
> {
  return createSolveStep(name, constraints, solveScript) as never;
}

export namespace Solve {
  export function All<
    const Name extends string,
    Ctx extends Record<string, any>,
    const Constraints extends readonly Constraint<UserScope<Ctx>>[],
  >(
    name: Name,
    ...constraints: Constraints
  ): StepResult<
    Ctx,
    Record<Name, void>,
    void,
    SolveResult<UserScope<Ctx>>
  > {
    return createSolveStep(name, constraints, solveAllScripts) as never;
  }
}

function createSolveStep<Ctx extends Record<string, any>, Result>(
  name: string,
  constraints: readonly Constraint<UserScope<Ctx>>[],
  solve: (
    smtScript: string,
    declarations: ReturnType<typeof collectDeclarations>,
  ) => Result,
) {
  const run = async function (this: Record<string, unknown>) {
    const declarations = collectDeclarations(this);
    const assertions = constraints.map(constraintToSmt);
    const smtScript = buildSmtScript({ declarations, assertions });

    return solve(smtScript, declarations);
  };

  return Object.assign(run, {
    [TW.Name]: name,
  });
}
