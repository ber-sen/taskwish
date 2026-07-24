import { TW } from "@taskwish/core";

import {
  SmtDeclarationsTag,
  type SmtDeclaration,
  type SmtDeclarations,
  type SmtSort,
} from "./types";

export function declareSort(sort: SmtSort, names: readonly string[]) {
  const run = function (): SmtDeclarations {
    return {
      [SmtDeclarationsTag]: true,
      declarations: names.map((name) => ({ name, sort })),
    };
  };

  return Object.assign(run, {
    [TW.Name]: `smt.${sort}.${names.join(".")}`,
  });
}

export function collectDeclarations(
  scope: Record<string, unknown>,
): SmtDeclaration[] {
  const declarations: SmtDeclaration[] = [];

  for (const value of Object.values(scope)) {
    if (!isSmtDeclarations(value)) continue;
    declarations.push(...value.declarations);
  }

  return dedupeDeclarations(declarations);
}

export function dedupeDeclarations(
  declarations: readonly SmtDeclaration[],
): SmtDeclaration[] {
  const seen = new Map<string, SmtDeclaration>();

  for (const declaration of declarations) {
    const existing = seen.get(declaration.name);
    if (existing && existing.sort !== declaration.sort) {
      throw new Error(
        `SMT variable "${declaration.name}" declared as both ${existing.sort} and ${declaration.sort}`,
      );
    }
    seen.set(declaration.name, declaration);
  }

  return [...seen.values()];
}

function isSmtDeclarations(value: unknown): value is SmtDeclarations {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as Record<symbol, unknown>)[SmtDeclarationsTag] === true &&
    Array.isArray((value as { declarations?: unknown }).declarations)
  );
}
