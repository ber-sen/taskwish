import { TW } from "@taskwish/core";

import { collectDeclarations, declareSort } from "./declarations";
import { constraintToSmt } from "./expression";
import { buildSmtScript } from "./script";
import type {
  AddSmtScope,
  Constraint,
  SmtDeclarations,
  SmtModelScope,
  SolveResult,
  StepResult,
  UserScope,
} from "./types";
import { orElseThrowScript, solveAllScripts, solveScript } from "./z3";

export function Int<
  Ctx extends Record<string, any>,
  const Names extends readonly [string, ...string[]],
>(...names: Names): StepResult<Ctx, AddSmtScope<"Int", Names>, SmtDeclarations> {
  return declareSort("Int", names) as never;
}

export function Real<
  Ctx extends Record<string, any>,
  const Names extends readonly [string, ...string[]],
>(
  ...names: Names
): StepResult<Ctx, AddSmtScope<"Real", Names>, SmtDeclarations> {
  return declareSort("Real", names) as never;
}

export function Bool<
  Ctx extends Record<string, any>,
  const Names extends readonly [string, ...string[]],
>(
  ...names: Names
): StepResult<Ctx, AddSmtScope<"Bool", Names>, SmtDeclarations> {
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
  Record<Name, SolveResult<SmtModelScope<Ctx>>>,
  SolveResult<SmtModelScope<Ctx>>
> {
  return createSolveStep(name, constraints, solveScript) as never;
}

export namespace Solve {
  export function orElseThrow<
    const Name extends string,
    Ctx extends Record<string, any>,
    const Constraints extends readonly Constraint<UserScope<Ctx>>[],
  >(
    name: Name,
    ...constraints: Constraints
  ): StepResult<Ctx, Record<Name, SmtModelScope<Ctx>>, SmtModelScope<Ctx>> {
    return createSolveStep(name, constraints, orElseThrowScript) as never;
  }

  export function all<
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
    SolveResult<SmtModelScope<Ctx>>
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
