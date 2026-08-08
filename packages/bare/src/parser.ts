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
  const publicActionNames = findPublicActionNames(sourceFile, actors);
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
      actionNames: parseServiceActions(serviceCall, publicActionNames),
      actorDeclaration: actor.declaration,
      declaration: variableStatement,
    });
  }

  return services;
}

function findPublicActionNames(
  sourceFile: SourceFile,
  actors: Map<string, ActorBinding>,
): Set<string> {
  const actionNames = new Set<string>();

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
    if (!actors.has(rootExpression.getText())) continue;
    if (isPublicActionChain(chain)) actionNames.add(exportedActionName);
  }

  return actionNames;
}

function isPublicActionChain(chain: CallChainItem[]): boolean {
  if (chain.some((item) => item.methodName === "command")) return true;

  const onCall = chain.find((item) => item.methodName === "on")?.call;
  const behavior = onCall?.getArguments()[0];
  if (!behavior) return false;

  const unwrapped = unwrapExpression(behavior);
  if (!Node.isStringLiteral(unwrapped)) return false;

  return ["Command", "GET", "POST", "PUT", "DELETE", "PATCH"].includes(
    unwrapped.getLiteralText(),
  );
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

function parseServiceActions(
  serviceCall: import("ts-morph").CallExpression,
  publicActionNames: Set<string>,
): string[] {
  const config = serviceCall.getArguments()[0];
  if (!config || !Node.isObjectLiteralExpression(config)) return [];

  return config
    .getProperties()
    .map((property) => {
      if (Node.isShorthandPropertyAssignment(property)) {
        return property.getNameNode().getText();
      }

      if (!Node.isPropertyAssignment(property)) return null;

      const initializer = unwrapExpression(property.getInitializerOrThrow());
      return Node.isIdentifier(initializer) ? initializer.getText() : null;
    })
    .filter(isDefined)
    .filter((actionName) => publicActionNames.has(actionName));
}
