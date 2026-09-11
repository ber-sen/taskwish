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
    [TW.Name]: `symbolic.${sort}.${names.join(".")}`,
  });
}

export function declareFunction(
  name: string,
  domain: readonly SmtSort[],
  range: SmtSort,
) {
  const run = function (): SmtDeclarations {
    return {
      [SmtDeclarationsTag]: true,
      declarations: [{ kind: "function", name, domain: [...domain], range }],
    };
  };

  return Object.assign(run, {
    [TW.Name]: `symbolic.Function.${name}`,
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
    if (
      existing &&
      declarationSignature(existing) !== declarationSignature(declaration)
    ) {
      throw new Error(
        `Symbolic name "${declaration.name}" has conflicting declarations`,
      );
    }
    seen.set(declaration.name, declaration);
  }

  return [...seen.values()];
}

function declarationSignature(declaration: SmtDeclaration): string {
  if (declaration.kind === "function") {
    return `(${declaration.domain.join(",")})=>${declaration.range}`;
  }
  return `constant:${declaration.sort}`;
}

function isSmtDeclarations(value: unknown): value is SmtDeclarations {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as Record<symbol, unknown>)[SmtDeclarationsTag] === true &&
    Array.isArray((value as { declarations?: unknown }).declarations)
  );
}
