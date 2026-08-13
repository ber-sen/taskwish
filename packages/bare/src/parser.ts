import { Node, SourceFile, SyntaxKind } from "ts-morph";

import { inputSchemaToType } from "./schema";
import { parseFunctionStep, parseStep } from "./step";
import { isDefined, unwrapExpression } from "./syntax";
import type {
  ActionDependency,
  ActionSpec,
  ActorBinding,
  CallChainItem,
  ServiceSpec,
} from "./types";

export function findActionSpecs(sourceFile: SourceFile): ActionSpec[] {
  const actors = findActorBindings(sourceFile);
  const eventInputTypes = collectEventInputTypes(sourceFile);
  const actions: ActionSpec[] = [];

  for (const declaration of sourceFile.getVariableDeclarations()) {
    const nameNode = declaration.getNameNode();
    if (!Node.isObjectBindingPattern(nameNode)) continue;
    if (!declaration.getFirstAncestorByKind(SyntaxKind.VariableStatement)) {
      continue;
    }

    const variableStatement = declaration.getFirstAncestorByKindOrThrow(
      SyntaxKind.VariableStatement
    );
    if (!variableStatement.isExported()) continue;

    const exportedActionName = nameNode
      .getElements()[0]
      ?.getNameNode()
      .getText();
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
    const eventName = actionEventName(chain);
    const runArguments = runCall.getArguments();
    const steps = runArguments.map(parseStep).filter(isDefined);
    if (steps.length === 0) {
      const directRunStep = parseFunctionStep(
        exportedActionName,
        runArguments[0]
      );
      if (directRunStep) steps.push(directRunStep);
    }
    const inputType = inputCall
      ? inputSchemaToType(inputCall.call.getArguments()[0])
      : eventName
      ? eventInputTypes.get(eventName) ??
        (usesThisInput(runArguments) ? "any" : null)
      : usesThisInput(runArguments)
      ? "any"
      : null;

    actions.push({
      actorName: actor.actorName,
      actionName: exportedActionName,
      listenEventName:
        eventName && eventName !== "Command"
          ? eventName.includes("::")
            ? eventName
            : `${actor.actorName}::${eventName}`
          : null,
      inputType,
      actorDeclaration: actor.declaration,
      declaration: variableStatement,
      steps,
      actionDependencies: resolveActionDependencies(actor, steps),
    });
  }

  return actions;
}

function resolveActionDependencies(
  actor: ActorBinding,
  steps: import("./types").StepSpec[],
): ActionDependency[] {
  const actionsByScope = new Map<string, Set<string>>();

  for (const step of steps) {
    for (const use of step.actionUses) {
      const [scopeName, actionName] = use.path;
      if (!scopeName || !actionName) continue;

      if (!actionsByScope.has(scopeName)) {
        actionsByScope.set(scopeName, new Set());
      }
      actionsByScope.get(scopeName)!.add(actionName);
    }
  }

  return [...actionsByScope.entries()].map(([scopeName, actionNames]) => {
    const dependency = actor.dependencies.find(
      (candidate) => candidate.scopeName === scopeName,
    );

    return {
      scopeName,
      actionNames: [...actionNames].sort(),
      identifier: dependency?.identifier ?? scopeName,
    };
  });
}

function actionEventName(chain: CallChainItem[]): string | null {
  const onCall = chain.find((call) => call.methodName === "on")?.call;
  const eventArg = onCall?.getArguments()[0];
  if (!eventArg) return null;

  const event = unwrapExpression(eventArg);
  return Node.isStringLiteral(event) ? event.getLiteralText() : null;
}

function collectEventInputTypes(
  sourceFile: SourceFile,
  visited = new Set<string>(),
): Map<string, string> {
  const filePath = sourceFile.getFilePath();
  if (visited.has(filePath)) return new Map();
  visited.add(filePath);

  const eventInputTypes = collectLocalEventInputTypes(sourceFile);

  for (const importDeclaration of sourceFile.getImportDeclarations()) {
    if (!importDeclaration.getModuleSpecifierValue().startsWith(".")) continue;

    const importedSourceFile = importDeclaration.getModuleSpecifierSourceFile();
    if (!importedSourceFile) continue;

    for (const [name, inputType] of collectEventInputTypes(
      importedSourceFile,
      visited,
    )) {
      eventInputTypes.set(name, inputType);
    }
  }

  return eventInputTypes;
}

function collectLocalEventInputTypes(sourceFile: SourceFile): Map<string, string> {
  const eventInputTypes = new Map<string, string>();

  for (const declaration of sourceFile.getVariableDeclarations()) {
    const nameNode = declaration.getNameNode();
    const initializer = declaration.getInitializer();
    if (!Node.isObjectBindingPattern(nameNode) || !initializer) continue;

    const actorCall = actorCallFromInitializer(initializer);
    if (!actorCall) continue;

    const actorNameArg = actorCall.getArguments()[0];
    if (!actorNameArg || !Node.isStringLiteral(actorNameArg)) continue;

    const actorName = actorNameArg.getLiteralText();
    const call = unwrapExpression(initializer);
    if (!Node.isCallExpression(call)) continue;

    for (const item of collectCallChain(call)) {
      if (item.methodName !== "scope") continue;

      for (const arg of item.call.getArguments()) {
        const event = parseEventInputType(actorName, arg);
        if (!event) continue;

        eventInputTypes.set(event.name, event.inputType);
        if (!event.name.includes("::")) {
          eventInputTypes.set(`${actorName}::${event.name}`, event.inputType);
        }
      }
    }
  }

  return eventInputTypes;
}

function parseEventInputType(
  actorName: string,
  node: Node,
): { name: string; inputType: string } | null {
  const call = unwrapExpression(node);
  if (!Node.isCallExpression(call)) return null;

  const expression = unwrapExpression(call.getExpression());
  if (!Node.isIdentifier(expression) || expression.getText() !== "Event") {
    return null;
  }

  const eventNameArg = call.getArguments()[0];
  if (!eventNameArg || !Node.isStringLiteral(eventNameArg)) return null;

  const eventName = eventNameArg.getLiteralText();
  const inputType = inputSchemaToType(call.getArguments()[1]);
  if (!inputType) return null;

  return {
    name: eventName.includes("::") ? eventName : `${actorName}::${eventName}`,
    inputType,
  };
}

function usesThisInput(nodes: Node[]): boolean {
  return nodes.some((node) =>
    node
      .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
      .some((propertyAccess) => {
        if (propertyAccess.getName() !== "input") return false;

        const expression = unwrapExpression(propertyAccess.getExpression());
        return Node.isThisExpression(expression);
      })
  );
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
      SyntaxKind.VariableStatement
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
  actors: Map<string, ActorBinding>
): Set<string> {
  const actionNames = new Set<string>();

  for (const declaration of sourceFile.getVariableDeclarations()) {
    const nameNode = declaration.getNameNode();
    if (!Node.isObjectBindingPattern(nameNode)) continue;
    if (!declaration.getFirstAncestorByKind(SyntaxKind.VariableStatement)) {
      continue;
    }

    const variableStatement = declaration.getFirstAncestorByKindOrThrow(
      SyntaxKind.VariableStatement
    );
    if (!variableStatement.isExported()) continue;

    const exportedActionName = nameNode
      .getElements()[0]
      ?.getNameNode()
      .getText();
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
    unwrapped.getLiteralText()
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
        SyntaxKind.VariableStatement
      ),
      dependencies: collectActorDependencies(initializer),
    });
  }

  return actors;
}

function collectActorDependencies(initializer: Node): ActorBinding["dependencies"] {
  const call = unwrapExpression(initializer);
  if (!Node.isCallExpression(call)) return [];

  const dependencies: ActorBinding["dependencies"] = [];

  for (const item of collectCallChain(call)) {
    if (item.methodName !== "use") continue;

    for (const argument of item.call.getArguments()) {
      const unwrapped = unwrapExpression(argument);
      if (!Node.isIdentifier(unwrapped)) continue;

      const identifier = unwrapped.getText();
      dependencies.push({
        identifier,
        scopeName: lowerFirst(identifier),
      });
    }
  }

  return dependencies;
}

function lowerFirst(value: string): string {
  return value.length === 0 ? value : `${value[0]!.toLowerCase()}${value.slice(1)}`;
}

function actorCallFromInitializer(
  initializer: Node
): import("ts-morph").CallExpression | null {
  const call = unwrapExpression(initializer);
  if (!Node.isCallExpression(call)) return null;

  const actorCall = findRootActorCall(call);
  if (actorCall) return actorCall;

  const expression = unwrapExpression(call.getExpression());
  if (!Node.isPropertyAccessExpression(expression)) return null;
  if (expression.getName() !== "def") return null;

  const receiver = unwrapExpression(expression.getExpression());
  if (!Node.isCallExpression(receiver)) return null;

  return findRootActorCall(receiver);
}

function findRootActorCall(
  call: import("ts-morph").CallExpression
): import("ts-morph").CallExpression | null {
  const expression = unwrapExpression(call.getExpression());
  if (Node.isIdentifier(expression) && expression.getText() === "Actor") {
    return call;
  }

  if (!Node.isPropertyAccessExpression(expression)) return null;

  const receiver = unwrapExpression(expression.getExpression());
  if (!Node.isCallExpression(receiver)) return null;

  return findRootActorCall(receiver);
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
  publicActionNames: Set<string>
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
