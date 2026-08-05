import { TW } from "@taskwish/core";

import { collectDeclarations, declareSort } from "./declarations";
import { constraintToSmt } from "./expression";
import { buildSmtScript } from "./script";
import { formatSymbol, valueToSmt } from "./symbols";
import type {
  AddSmtScope,
  Constraint,
  ModelInput,
  SmtDeclarations,
  SmtDeclaration,
  SmtModelScope,
  StepResult,
  SymbolicModel,
  UserScope,
} from "./types";
import { solveAllScripts, solveScript, solveScriptOrThrow } from "./z3";

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

export function Model<
  const Name extends string,
  Ctx extends Record<string, any>,
  const Constraints extends readonly Constraint<UserScope<Ctx>>[],
>(
  name: Name,
  ...constraints: Constraints
): StepResult<
  Ctx,
  Record<Name, SymbolicModel<SmtModelScope<Ctx>>>,
  SymbolicModel<SmtModelScope<Ctx>>
> {
  return createModelStep(name, constraints) as never;
}

function createModelStep<Ctx extends Record<string, any>>(
  name: string,
  constraints: readonly Constraint<UserScope<Ctx>>[],
) {
  const run = function (this: Record<string, unknown>) {
    const declarations = collectDeclarations(this);
    const baseAssertions = constraints.map(constraintToSmt);

    const buildScript = (input?: ModelInput<Record<string, unknown>>) => {
      return buildSmtScript({
        declarations,
        assertions: [
          ...baseAssertions,
          ...fixedInputAssertions(input, declarations),
        ],
      });
    };

    return {
      solve(input?: ModelInput<Record<string, unknown>>) {
        return solveScriptOrThrow(buildScript(input), declarations);
      },
      prove(input?: ModelInput<Record<string, unknown>>) {
        return solveScript(buildScript(input), declarations);
      },
      async *solveAll(input?: ModelInput<Record<string, unknown>>) {
        for await (const result of solveAllScripts(
          buildScript(input),
          declarations,
        )) {
          yield result.model;
        }
      },
    };
  };

  return Object.assign(run, {
    [TW.Name]: name,
  });
}

function fixedInputAssertions(
  input: ModelInput<Record<string, unknown>> | undefined,
  declarations: readonly SmtDeclaration[],
): string[] {
  if (input === undefined) return [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Symbolic model inputs must be an object");
  }

  const declarationsByName = new Map(
    declarations.map((declaration) => [declaration.name, declaration]),
  );

  return Object.entries(input).flatMap(([name, value]) => {
    if (value === undefined) return [];

    const declaration = declarationsByName.get(name);
    if (!declaration) {
      throw new Error(
        `Cannot solve symbolic model with unknown variable "${name}"`,
      );
    }

    return `(= ${formatSymbol(name)} ${fixedValueToSmt(value, declaration)})`;
  });
}

function fixedValueToSmt(value: unknown, declaration: SmtDeclaration): string {
  if (declaration.sort === "Bool") {
    if (typeof value !== "boolean") {
      throw new Error(
        `Symbolic variable "${declaration.name}" expects a boolean`,
      );
    }
    return valueToSmt(value);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Symbolic variable "${declaration.name}" expects a number`);
  }

  if (declaration.sort === "Int" && !Number.isInteger(value)) {
    throw new Error(
      `Symbolic variable "${declaration.name}" expects an integer`,
    );
  }

  return valueToSmt(value);
}
