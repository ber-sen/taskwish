import { Node, SourceFile, SyntaxKind } from "ts-morph";

import { inputSchemaToType } from "./schema";
import { parseStep } from "./step";
import { isDefined, unwrapExpression } from "./syntax";
import type {
  ActionSpec,
  ActorBinding,
  CallChainItem,
  ServiceSpec,
} from "./types";

export function findActionSpecs(sourceFile: SourceFile): ActionSpec[] {
  const actors = findActorBindings(sourceFile);
  const actions: ActionSpec[] = [];

  for (const declaration of sourceFile.getVariableDeclarations()) {
    const nameNode = declaration.getNameNode();
    if (!Node.isObjectBindingPattern(nameNode)) continue;
    if (!declaration.getFirstAncestorByKind(SyntaxKind.VariableStatement)) {
      continue;
    }

    const variableStatement = declaration.getFirstAncestorByKindOrThrow(
      SyntaxKind.VariableStatement,
    );
    if (!variableStatement.isExported()) continue;

    const exportedActionName = nameNode.getElements()[0]?.getNameNode().getText();
    if (!exportedActionName) continue;

    const initializer = declaration.getInitializer();
    if (!initializer) continue;

    const runCall = unwrapExpression(initializer);
    if (!Node.isCallExpression(runCall)) continue;

    const chain = collectCallChain(runCall);
    if (chain.at(-1)?.methodName !== "run") continue;

    const root = chain[0]?.receiver;
    if (!root || !Node.isCallExpression(root)) continue;

    const rootExpression = unwrapExpression(root.getExpression());
    if (!Node.isIdentifier(rootExpression)) continue;

    const actor = actors.get(rootExpression.getText());
    if (!actor) continue;

    const inputCall = chain.find((call) => call.methodName === "input");
    const inputType = inputCall
      ? inputSchemaToType(inputCall.call.getArguments()[0])
      : null;

    actions.push({
      actorName: actor.actorName,
      actionName: exportedActionName,
      inputType,
      actorDeclaration: actor.declaration,
      declaration: variableStatement,
      steps: runCall.getArguments().map(parseStep).filter(isDefined),
    });
  }

  return actions;
}

export function findServiceSpecs(sourceFile: SourceFile): ServiceSpec[] {
  const actors = findActorBindings(sourceFile);
  const services: ServiceSpec[] = [];

  for (const declaration of sourceFile.getVariableDeclarations()) {
    const nameNode = declaration.getNameNode();
    if (!Node.isObjectBindingPattern(nameNode)) continue;
    if (!declaration.getFirstAncestorByKind(SyntaxKind.VariableStatement)) {
      continue;
    }

    const variableStatement = declaration.getFirstAncestorByKindOrThrow(
      SyntaxKind.VariableStatement,
    );
    if (!variableStatement.isExported()) continue;

    const serviceName = nameNode.getElements()[0]?.getNameNode().getText();
    if (!serviceName) continue;

    const initializer = declaration.getInitializer();
    if (!initializer) continue;

    const serviceCall = unwrapExpression(initializer);
    if (!Node.isCallExpression(serviceCall)) continue;

    const chain = collectCallChain(serviceCall);
    if (chain.at(-1)?.methodName !== "service") continue;

    const root = chain[0]?.receiver;
    if (!root || !Node.isCallExpression(root)) continue;

    const rootExpression = unwrapExpression(root.getExpression());
    if (!Node.isIdentifier(rootExpression)) continue;

    const actor = actors.get(rootExpression.getText());
    if (!actor) continue;

    services.push({
      serviceName,
      actionNames: parsePublicServiceActions(serviceCall),
      actorDeclaration: actor.declaration,
      declaration: variableStatement,
    });
  }

  return services;
}

function findActorBindings(sourceFile: SourceFile): Map<string, ActorBinding> {
  const actors = new Map<string, ActorBinding>();

  for (const declaration of sourceFile.getVariableDeclarations()) {
    const nameNode = declaration.getNameNode();
    const initializer = declaration.getInitializer();
    if (!Node.isObjectBindingPattern(nameNode) || !initializer) continue;

    const call = actorCallFromInitializer(initializer);
    if (!call) continue;

    const actorNameArg = call.getArguments()[0];
    if (!actorNameArg || !Node.isStringLiteral(actorNameArg)) continue;

    const factoryName = nameNode.getElements()[0]?.getNameNode().getText();
    if (!factoryName) continue;

    actors.set(factoryName, {
      actorName: actorNameArg.getLiteralText(),
      declaration: declaration.getFirstAncestorByKindOrThrow(
        SyntaxKind.VariableStatement,
      ),
    });
  }

  return actors;
}

function actorCallFromInitializer(
  initializer: Node,
): import("ts-morph").CallExpression | null {
  const call = unwrapExpression(initializer);
  if (!Node.isCallExpression(call)) return null;

  const expression = unwrapExpression(call.getExpression());
  if (Node.isIdentifier(expression) && expression.getText() === "Actor") {
    return call;
  }

  if (!Node.isPropertyAccessExpression(expression)) return null;
  if (expression.getName() !== "def") return null;

  const receiver = unwrapExpression(expression.getExpression());
  if (!Node.isCallExpression(receiver)) return null;

  const receiverExpression = unwrapExpression(receiver.getExpression());
  if (
    !Node.isIdentifier(receiverExpression) ||
    receiverExpression.getText() !== "Actor"
  ) {
    return null;
  }

  return receiver;
}

function collectCallChain(call: Node): CallChainItem[] {
  if (!Node.isCallExpression(call)) return [];

  const expression = unwrapExpression(call.getExpression());
  if (!Node.isPropertyAccessExpression(expression)) return [];

  const receiver = unwrapExpression(expression.getExpression());
  const previous = Node.isCallExpression(receiver)
    ? collectCallChain(receiver)
    : [];

  return [
    ...previous,
    {
      call,
      methodName: expression.getName(),
      receiver,
    },
  ];
}

function parsePublicServiceActions(
  serviceCall: import("ts-morph").CallExpression,
): string[] {
  const config = serviceCall.getArguments()[0];
  if (!config || !Node.isObjectLiteralExpression(config)) return [];

  const publicProperty = config
    .getProperties()
    .find((property) => {
      if (!Node.isPropertyAssignment(property)) return false;

      const nameNode = property.getNameNode();
      return (
        (Node.isIdentifier(nameNode) && nameNode.getText() === "public") ||
        (Node.isStringLiteral(nameNode) &&
          nameNode.getLiteralText() === "public")
      );
    });

  if (!publicProperty || !Node.isPropertyAssignment(publicProperty)) return [];

  const initializer = unwrapExpression(publicProperty.getInitializerOrThrow());
  if (!Node.isArrayLiteralExpression(initializer)) return [];

  return initializer
    .getElements()
    .map((element) => unwrapExpression(element))
    .filter(Node.isIdentifier)
    .map((identifier) => identifier.getText());
}
