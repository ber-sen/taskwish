import { Node, SyntaxKind, ts } from "ts-morph";

import { ownReturnStatements, unwrapExpression } from "./syntax";
import type { FunctionReturnInfo } from "./types";

export function inferFunctionReturn(
  fn: import("ts-morph").FunctionExpression,
): FunctionReturnInfo {
  const returns = ownReturnStatements(fn);

  if (returns.length === 0) {
    return {
      propertyType: "unknown",
      shouldAwait: fn.isAsync(),
    };
  }

  const returnInfos = returns.map((returnStatement) => {
    const expression = returnStatement.getExpression();
    return expression
      ? inferExpressionReturn(expression)
      : expressionReturnInfo("void");
  });
  const shouldAwait = fn.isAsync() || returnInfos.some((info) => info.shouldAwait);
  const propertyTypes = returnInfos.map((info) =>
    shouldAwait ? info.awaitedType ?? info.propertyType : info.propertyType,
  );
  const uniquePropertyTypes = [...new Set(propertyTypes)];

  return {
    propertyType: uniquePropertyTypes.join(" | "),
    shouldAwait,
  };
}

type ExpressionReturnInfo = FunctionReturnInfo & {
  awaitedType: string | null;
};

function inferExpressionReturn(expression: Node): ExpressionReturnInfo {
  const node = unwrapExpression(expression);

  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return expressionReturnInfo("string");
  }
  if (Node.isAwaitExpression(node)) {
    const awaitedType = typeToText(node.getType(), node);
    return {
      propertyType: awaitedType,
      awaitedType,
      shouldAwait: true,
    };
  }
  if (Node.isTemplateExpression(node)) return expressionReturnInfo("string");
  if (Node.isNumericLiteral(node)) return expressionReturnInfo("number");
  if (
    node.getKind() === SyntaxKind.TrueKeyword ||
    node.getKind() === SyntaxKind.FalseKeyword
  ) {
    return expressionReturnInfo("boolean");
  }
  if (Node.isPropertyAccessExpression(node) && node.getName() === "length") {
    return expressionReturnInfo("number");
  }
  if (Node.isBinaryExpression(node)) {
    const operator = node.getOperatorToken().getKind();
    if (
      operator === SyntaxKind.PlusToken ||
      operator === SyntaxKind.MinusToken ||
      operator === SyntaxKind.AsteriskToken ||
      operator === SyntaxKind.SlashToken ||
      operator === SyntaxKind.PercentToken ||
      operator === SyntaxKind.AsteriskAsteriskToken
    ) {
      return expressionReturnInfo("number");
    }
    if (
      operator === SyntaxKind.GreaterThanToken ||
      operator === SyntaxKind.GreaterThanEqualsToken ||
      operator === SyntaxKind.LessThanToken ||
      operator === SyntaxKind.LessThanEqualsToken ||
      operator === SyntaxKind.EqualsEqualsToken ||
      operator === SyntaxKind.EqualsEqualsEqualsToken ||
      operator === SyntaxKind.ExclamationEqualsToken ||
      operator === SyntaxKind.ExclamationEqualsEqualsToken
    ) {
      return expressionReturnInfo("boolean");
    }
  }
  if (Node.isArrayLiteralExpression(node)) return expressionReturnInfo("unknown[]");
  if (Node.isObjectLiteralExpression(node)) return expressionReturnInfo(node.getText());

  return inferTypeReturn(node.getType(), node);
}

function expressionReturnInfo(propertyType: string): ExpressionReturnInfo {
  return {
    propertyType,
    awaitedType: propertyType,
    shouldAwait: false,
  };
}

function inferTypeReturn(
  type: import("ts-morph").Type,
  node: Node,
): ExpressionReturnInfo {
  const propertyType = typeToText(type, node);
  const awaitedType = getAwaitedTypeText(type, node);

  return {
    propertyType,
    awaitedType,
    shouldAwait: awaitedType !== null && awaitedType !== propertyType,
  };
}

function typeToText(type: import("ts-morph").Type, node: Node): string {
  const text = type.getText(node, ts.TypeFormatFlags.NoTruncation);
  return text === "any" ? "unknown" : text;
}

function getAwaitedTypeText(
  type: import("ts-morph").Type,
  node: Node,
): string | null {
  const checker = node.getProject().getTypeChecker().compilerObject;
  const awaitedType = checker.getAwaitedType(type.compilerType);
  if (!awaitedType) return null;

  const text = checker.typeToString(
    awaitedType,
    node.compilerNode,
    ts.TypeFormatFlags.NoTruncation,
  );
  return text === "any" ? "unknown" : text;
}
