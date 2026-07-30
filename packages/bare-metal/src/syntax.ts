import { Node, SyntaxKind } from "ts-morph";

export function unwrapExpression<T extends Node>(node: T): Node {
  let current: Node = node;

  while (
    Node.isParenthesizedExpression(current) ||
    Node.isAsExpression(current) ||
    Node.isTypeAssertion(current) ||
    Node.isNonNullExpression(current)
  ) {
    current = current.getExpression();
  }

  return current;
}

export function belongsToFunction(node: Node, owner: Node): boolean {
  for (const ancestor of node.getAncestors()) {
    if (ancestor === owner) return true;
    if (isFunctionLikeBoundary(ancestor)) return false;
  }

  return false;
}

export function ownReturnStatements(
  fn: import("ts-morph").FunctionExpression,
): import("ts-morph").ReturnStatement[] {
  return fn
    .getDescendantsOfKind(SyntaxKind.ReturnStatement)
    .filter((returnStatement) => belongsToFunction(returnStatement, fn));
}

export function isDirectFinalReturn(
  returnStatement: import("ts-morph").ReturnStatement,
  fn: import("ts-morph").FunctionExpression,
): boolean {
  const body = fn.getBody();
  if (!body || !Node.isBlock(body)) return false;

  return (
    returnStatement.getParent() === body &&
    body.getStatements().at(-1) === returnStatement
  );
}

export function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => (line.trim() ? `${prefix}${line}` : line))
    .join("\n");
}

export function normalizeBlock(value: string): string {
  const lines = value.replace(/\s+$/, "").split("\n");
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

  return lines.map((line) => line.slice(minIndent)).join("\n");
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function isFunctionLikeBoundary(node: Node): boolean {
  return (
    Node.isFunctionDeclaration(node) ||
    Node.isFunctionExpression(node) ||
    Node.isArrowFunction(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isGetAccessorDeclaration(node) ||
    Node.isSetAccessorDeclaration(node) ||
    Node.isConstructorDeclaration(node)
  );
}
