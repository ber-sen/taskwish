import { Node, SyntaxKind, ts } from "ts-morph";

import { belongsToFunction, ownReturnStatements, unwrapExpression } from "./syntax";
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
  const syntaxInfo = inferExpressionReturnFromSyntax(node);
  if (syntaxInfo) return syntaxInfo;

  if (Node.isAwaitExpression(node)) {
    const awaitedType = typeToText(node.getType(), node);
    return {
      propertyType: awaitedType,
      awaitedType,
      shouldAwait: true,
    };
  }
  if (Node.isCallExpression(node) && usesThisActions(node.getExpression())) {
    return {
      propertyType: "unknown",
      awaitedType: "unknown",
      shouldAwait: true,
    };
  }

  return inferTypeReturn(node.getType(), node);
}

function inferExpressionReturnFromSyntax(
  expression: Node,
): ExpressionReturnInfo | null {
  const node = unwrapExpression(expression);

  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return expressionReturnInfo("string");
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
  if (Node.isObjectLiteralExpression(node)) return inferObjectLiteralReturn(node);
  if (Node.isIdentifier(node)) return inferIdentifierReturn(node);
  if (Node.isAwaitExpression(node)) {
    const innerInfo = inferExpressionReturnFromSyntax(node.getExpression());
    if (!innerInfo) return null;

    const propertyType = innerInfo.awaitedType ?? innerInfo.propertyType;
    return {
      propertyType,
      awaitedType: propertyType,
      shouldAwait: true,
    };
  }
  if (Node.isCallExpression(node)) return inferCallReturn(node);

  return null;
}

function inferObjectLiteralReturn(
  node: import("ts-morph").ObjectLiteralExpression,
): ExpressionReturnInfo | null {
  const properties: string[] = [];

  for (const property of node.getProperties()) {
    if (Node.isSpreadAssignment(property)) return null;

    if (Node.isShorthandPropertyAssignment(property)) {
      const name = property.getNameNode().getText();
      const info = inferIdentifierReturn(property.getNameNode());
      if (!info) return null;

      properties.push(`${name}: ${info.propertyType};`);
      continue;
    }

    if (!Node.isPropertyAssignment(property)) return null;

    const name = propertyNameText(property.getNameNode());
    if (!name) return null;

    const info = inferExpressionReturnFromSyntax(property.getInitializerOrThrow());
    if (!info) return null;

    properties.push(`${name}: ${info.propertyType};`);
  }

  return expressionReturnInfo(`{ ${properties.join(" ")} }`);
}

function propertyNameText(node: Node): string | null {
  if (Node.isIdentifier(node)) return node.getText();
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralText();
  }
  return null;
}

function inferIdentifierReturn(node: import("ts-morph").Identifier): ExpressionReturnInfo | null {
  const declarations = node
    .getSourceFile()
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .filter((declaration) => declaration.getName() === node.getText())
    .filter((declaration) => declaration.getStart() < node.getStart())
    .sort((a, b) => b.getStart() - a.getStart());
  const declaration = declarations[0];
  const initializer = declaration?.getInitializer();
  return initializer ? inferExpressionReturnFromSyntax(initializer) : null;
}

function inferCallReturn(
  node: import("ts-morph").CallExpression,
): ExpressionReturnInfo | null {
  const propertyAccessReturn = inferPropertyAccessCallReturn(node);
  if (propertyAccessReturn) return propertyAccessReturn;

  if (isPromiseResolveCall(node)) {
    const value = node.getArguments()[0];
    const info = value ? inferExpressionReturnFromSyntax(value) : null;
    const propertyType = info?.propertyType ?? "unknown";

    return {
      propertyType: `Promise<${propertyType}>`,
      awaitedType: propertyType,
      shouldAwait: true,
    };
  }

  const expression = unwrapExpression(node.getExpression());
  if (!Node.isIdentifier(expression)) return null;

  const fn = node.getSourceFile().getFunction(expression.getText());
  if (!fn) return null;

  return inferFunctionDeclarationReturn(fn);
}

function inferPropertyAccessCallReturn(
  node: import("ts-morph").CallExpression,
): ExpressionReturnInfo | null {
  const expression = unwrapExpression(node.getExpression());
  if (!Node.isPropertyAccessExpression(expression)) return null;

  return stringReturningMethodNames.has(expression.getName())
    ? expressionReturnInfo("string")
    : null;
}

const stringReturningMethodNames = new Set([
  "toLocaleLowerCase",
  "toLocaleUpperCase",
  "toLowerCase",
  "toString",
  "toUpperCase",
  "trim",
  "url",
  "title",
]);

function isPromiseResolveCall(node: import("ts-morph").CallExpression): boolean {
  const expression = unwrapExpression(node.getExpression());
  if (!Node.isPropertyAccessExpression(expression)) return false;
  if (expression.getName() !== "resolve") return false;

  const receiver = unwrapExpression(expression.getExpression());
  return Node.isIdentifier(receiver) && receiver.getText() === "Promise";
}

function inferFunctionDeclarationReturn(
  fn: import("ts-morph").FunctionDeclaration,
): ExpressionReturnInfo | null {
  const returnType = fn.getReturnTypeNode();
  if (returnType) {
    const text = returnType.getText();
    const awaited = unwrapPromiseTypeText(text);
    return {
      propertyType: text,
      awaitedType: awaited ?? text,
      shouldAwait: awaited !== null,
    };
  }

  const returns = fn
    .getDescendantsOfKind(SyntaxKind.ReturnStatement)
    .filter((returnStatement) => belongsToFunction(returnStatement, fn));
  if (returns.length === 0) return null;

  const returnInfos = returns.map((returnStatement) => {
    const returned = returnStatement.getExpression();
    return returned ? inferExpressionReturnFromSyntax(returned) : expressionReturnInfo("void");
  });
  if (returnInfos.some((info) => info === null)) return null;

  const shouldAwait =
    fn.isAsync() || returnInfos.some((info) => info?.shouldAwait);
  const propertyTypes = returnInfos.map((info) =>
    shouldAwait ? info!.awaitedType ?? info!.propertyType : info!.propertyType,
  );
  const uniquePropertyTypes = [...new Set(propertyTypes)];
  const propertyType = uniquePropertyTypes.join(" | ");

  return {
    propertyType,
    awaitedType: propertyType,
    shouldAwait,
  };
}

function unwrapPromiseTypeText(text: string): string | null {
  const match = text.match(/^Promise<(.+)>$/);
  return match?.[1] ?? null;
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

function usesThisActions(node: Node): boolean {
  const current = unwrapExpression(node);

  if (!Node.isPropertyAccessExpression(current)) return false;

  const expression = unwrapExpression(current.getExpression());
  if (Node.isThisExpression(expression) && current.getName() === "actions") {
    return true;
  }

  return usesThisActions(expression);
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
