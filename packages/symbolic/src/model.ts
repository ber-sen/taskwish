import { formatSymbol, valueToSmt } from "./symbols";
import type { SExpr, SmtDeclaration } from "./types";

export function parseModel(
  output: string,
  declarations: readonly SmtDeclaration[],
): Record<string, unknown> {
  const wanted = new Set(
    declarations.flatMap((declaration) =>
      declaration.kind === "function" ? [] : [declaration.name],
    ),
  );
  const model: Record<string, unknown> = {};

  for (const expr of parseSExpressions(output)) {
    collectModelEntries(expr, wanted, model);
  }

  return model;
}

export function modelExclusion(
  model: Record<string, unknown>,
  declarations: readonly SmtDeclaration[],
): string | null {
  const equalities = declarations.flatMap((declaration) => {
    if (declaration.kind === "function") return [];
    const value = model[declaration.name];
    if (value === undefined) return [];
    return [`(= ${formatSymbol(declaration.name)} ${valueToSmt(value)})`];
  });

  if (equalities.length === 0) return null;
  if (equalities.length === 1) return `(not ${equalities[0]})`;
  return `(not (and ${equalities.join(" ")}))`;
}

function collectModelEntries(
  expr: SExpr,
  wanted: Set<string>,
  model: Record<string, unknown>,
) {
  if (!Array.isArray(expr)) return;

  if (
    expr[0] === "define-fun" &&
    typeof expr[1] === "string" &&
    wanted.has(expr[1])
  ) {
    model[expr[1]] = smtValueToJs(expr[4]);
    return;
  }

  for (const child of expr) collectModelEntries(child, wanted, model);
}

function parseSExpressions(input: string): SExpr[] {
  const tokens = input.match(/\(|\)|[^\s()]+/g) ?? [];
  const expressions: SExpr[] = [];
  let index = 0;

  function parse(): SExpr {
    const token = tokens[index++];
    if (token === undefined) throw new Error("Unexpected end of SMT output");
    if (token !== "(") return token;

    const list: SExpr[] = [];
    while (tokens[index] !== ")") {
      if (tokens[index] === undefined) throw new Error("Unclosed SMT list");
      list.push(parse());
    }
    index++;
    return list;
  }

  while (index < tokens.length) expressions.push(parse());
  return expressions;
}

function smtValueToJs(expr: SExpr | undefined): unknown {
  if (expr === undefined) return undefined;
  if (typeof expr === "string") {
    if (expr === "true") return true;
    if (expr === "false") return false;
    if (/^-?\d+$/.test(expr)) return Number(expr);
    if (/^-?\d+\.\d+$/.test(expr)) return Number(expr);
    return expr;
  }

  const [operator, left, right] = expr;
  if (operator === "-" && right === undefined) {
    const value = smtValueToJs(left);
    return typeof value === "number" ? -value : expr;
  }
  if (operator === "/" && right !== undefined) {
    const numerator = smtValueToJs(left);
    const denominator = smtValueToJs(right);
    return typeof numerator === "number" &&
      typeof denominator === "number" &&
      denominator !== 0
      ? numerator / denominator
      : expr;
  }

  return expr;
}
