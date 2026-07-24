import jsep from "jsep";

import { formatSymbol, required } from "./symbols";
import type { AstNode } from "./types";

export function constraintToSmt(constraint: Function): string {
  const expression = extractExpression(constraint.toString());
  return astToSmt(jsep(expression) as AstNode);
}

function extractExpression(source: string): string {
  const arrowIndex = source.indexOf("=>");
  if (arrowIndex !== -1) {
    return normalizeFunctionBody(source.slice(arrowIndex + 2).trim());
  }

  const returnMatch = source.match(/\breturn\s+([\s\S]*?);?\s*\}/);
  if (returnMatch) return returnMatch[1].trim();

  throw new Error(`Cannot extract an expression from constraint: ${source}`);
}

function normalizeFunctionBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return stripOuterParens(trimmed);

  const returnMatch = trimmed.match(/^\{\s*return\s+([\s\S]*?);?\s*\}$/);
  if (!returnMatch) {
    throw new Error(`SMT constraint blocks must return a single expression`);
  }

  return stripOuterParens(returnMatch[1].trim());
}

function stripOuterParens(expression: string): string {
  let current = expression.trim();

  while (current.startsWith("(") && current.endsWith(")")) {
    const inner = current.slice(1, -1).trim();
    if (!hasBalancedParens(inner)) break;
    current = inner;
  }

  return current;
}

function hasBalancedParens(input: string): boolean {
  let depth = 0;
  for (const char of input) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function astToSmt(node: AstNode): string {
  switch (node.type) {
    case "Identifier":
      return formatSymbol(required(node.name, "identifier name"));
    case "Literal":
      return literalToSmt(node.value);
    case "BinaryExpression":
    case "LogicalExpression":
      return binaryToSmt(node);
    case "UnaryExpression":
      return unaryToSmt(node);
    case "MemberExpression":
      return memberToSmt(node);
    case "ThisExpression":
      return "this";
    case "CallExpression":
      return callToSmt(node);
    default:
      throw new Error(`Unsupported SMT expression node "${node.type}"`);
  }
}

function binaryToSmt(node: AstNode): string {
  const left = astToSmt(required(node.left, "binary left operand"));
  const right = astToSmt(required(node.right, "binary right operand"));
  const operator = smtOperator(required(node.operator, "binary operator"));

  return `(${operator} ${left} ${right})`;
}

function unaryToSmt(node: AstNode): string {
  const operator = required(node.operator, "unary operator");
  const argument = astToSmt(required(node.argument, "unary argument"));

  if (operator === "!") return `(not ${argument})`;
  if (operator === "-") return `(- ${argument})`;
  if (operator === "+") return argument;

  throw new Error(`Unsupported SMT unary operator "${operator}"`);
}

function memberToSmt(node: AstNode): string {
  const property = required(node.property, "member property");
  if (node.computed) {
    throw new Error("Computed member expressions are not supported in SMT");
  }

  if (property.type !== "Identifier") {
    throw new Error("Only identifier member properties are supported in SMT");
  }

  if (node.object?.type === "ThisExpression") {
    return formatSymbol(required(property.name, "member property name"));
  }

  return formatSymbol(
    `${astToSmt(required(node.object, "member object"))}.${required(
      property.name,
      "member property name",
    )}`,
  );
}

function callToSmt(node: AstNode): string {
  const callee = node.callee;
  const args = node.arguments?.map(astToSmt) ?? [];

  if (callee?.type === "MemberExpression") {
    const object = callee.object;
    const property = callee.property;
    if (
      object?.type === "Identifier" &&
      object.name === "Math" &&
      property?.type === "Identifier" &&
      property.name === "abs" &&
      args.length === 1
    ) {
      return `(abs ${args[0]})`;
    }
  }

  throw new Error("Only Math.abs(...) calls are supported in SMT expressions");
}

function smtOperator(operator: string): string {
  switch (operator) {
    case "==":
    case "===":
      return "=";
    case "!=":
    case "!==":
      return "distinct";
    case "&&":
      return "and";
    case "||":
      return "or";
    case "%":
      return "mod";
    case "**":
      return "^";
    case "+":
    case "-":
    case "*":
    case "/":
    case ">":
    case ">=":
    case "<":
    case "<=":
      return operator;
    default:
      throw new Error(`Unsupported SMT binary operator "${operator}"`);
  }
}

function literalToSmt(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toString();
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  throw new Error(`Unsupported SMT literal ${JSON.stringify(value)}`);
}
