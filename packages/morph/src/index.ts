import {
  ImportDeclaration,
  Node,
  Project,
  QuoteKind,
  ScriptTarget,
  SourceFile,
  SyntaxKind,
  ts,
} from "ts-morph";

export type MorphOptions = {
  filePath?: string;
};

type ActorBinding = {
  actorName: string;
  declaration: import("ts-morph").VariableStatement;
};

type ActionSpec = {
  actorName: string;
  actionName: string;
  inputType: string | null;
  declaration: import("ts-morph").VariableStatement;
  steps: StepSpec[];
};

type StepSpec = {
  name: string;
  propertyType: string;
  methodText: string;
};

export function morph(sourceText: string, options: MorphOptions = {}): string {
  const project = new Project({
    compilerOptions: {
      allowJs: false,
      esModuleInterop: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      resolveJsonModule: true,
      skipLibCheck: true,
      strict: true,
      target: ScriptTarget.ESNext,
    },
    manipulationSettings: {
      quoteKind: QuoteKind.Double,
    },
  });

  const sourceFile = project.createSourceFile(
    options.filePath ?? "actor.ts",
    sourceText,
    { overwrite: true },
  );
  const actions = findActionSpecs(sourceFile);

  if (actions.length === 0) {
    throw new Error("No TaskWish actor action chain found.");
  }

  const preservedSource = preserveNonActorSource(sourceFile, actions);
  const generatedSource = actions.map(printAction).join("\n\n");

  return [preservedSource, generatedSource].filter(Boolean).join("\n\n");
}

export const transform = morph;

function findActionSpecs(sourceFile: SourceFile): ActionSpec[] {
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
      declaration: variableStatement,
      steps: runCall.getArguments().map(parseStep).filter(isDefined),
    });
  }

  return actions;
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

function preserveNonActorSource(
  sourceFile: SourceFile,
  actions: ActionSpec[],
): string {
  const actorDeclarations = findActorBindings(sourceFile);
  const declarationsToRemove = new Set<import("ts-morph").VariableStatement>();

  for (const actor of actorDeclarations.values()) {
    declarationsToRemove.add(actor.declaration);
  }
  for (const action of actions) {
    declarationsToRemove.add(action.declaration);
  }

  for (const statement of declarationsToRemove) {
    statement.remove();
  }

  for (const importDeclaration of sourceFile.getImportDeclarations()) {
    removeTaskWishSpecifiers(importDeclaration);
  }

  return sourceFile.getFullText().trim();
}

function removeTaskWishSpecifiers(importDeclaration: ImportDeclaration): void {
  for (const namedImport of importDeclaration.getNamedImports()) {
    const name = namedImport.getName();
    if (name === "Actor" || name === "Step") namedImport.remove();
  }

  if (
    importDeclaration.getNamedImports().length === 0 &&
    !importDeclaration.getDefaultImport() &&
    !importDeclaration.getNamespaceImport()
  ) {
    importDeclaration.remove();
  }
}

function collectCallChain(call: Node): {
  call: import("ts-morph").CallExpression;
  methodName: string;
  receiver: Node;
}[] {
  if (!Node.isCallExpression(call)) return [];

  const expression = unwrapExpression(call.getExpression());
  if (!Node.isPropertyAccessExpression(expression)) return [];

  const receiver = unwrapExpression(expression.getExpression());
  const previous = Node.isCallExpression(receiver) ? collectCallChain(receiver) : [];

  return [
    ...previous,
    {
      call,
      methodName: expression.getName(),
      receiver,
    },
  ];
}

function parseStep(node: Node): StepSpec | null {
  const call = unwrapExpression(node);
  if (!Node.isCallExpression(call)) return null;

  const expression = unwrapExpression(call.getExpression());
  if (!Node.isIdentifier(expression) || expression.getText() !== "Step") {
    return null;
  }

  const [nameArg, handlerArg] = call.getArguments();
  if (!nameArg || !Node.isStringLiteral(nameArg) || !handlerArg) return null;

  const handler = Array.isArray(handlerArg) ? null : unwrapExpression(handlerArg);
  if (!handler || !Node.isFunctionExpression(handler)) return null;

  const name = nameArg.getLiteralText();
  const bodyText = normalizeBlock(handler.getBodyText() ?? "");

  return {
    name,
    propertyType: inferFunctionReturnType(handler),
    methodText: `async #${name}() {\n${indent(bodyText, 2)}\n}`,
  };
}

function inputSchemaToType(node: Node | undefined): string | null {
  if (!node) return null;
  const inferred = inferArkTypeSchema(node);
  if (inferred) return inferred;

  const schema = unwrapExpression(node);
  if (!Node.isObjectLiteralExpression(schema)) return "unknown";
  return objectLiteralSchemaToType(schema);
}

let arkTypeProbeId = 0;

function inferArkTypeSchema(node: Node): string | null {
  const schema = unwrapExpression(node);
  const project = schema.getProject();
  const sourceFile = schema.getSourceFile();
  const probePath = `${sourceFile.getDirectoryPath()}/.taskwish-morph-arktype-${
    arkTypeProbeId++
  }.ts`;

  const probe = project.createSourceFile(
    probePath,
    [
      `import { type } from "arktype";`,
      `type Input = type.infer<${schema.getText()}>;`,
      `let input!: Input;`,
    ].join("\n"),
    { overwrite: true },
  );

  try {
    if (probe.getPreEmitDiagnostics().length > 0) return null;

    const input = probe.getVariableDeclarationOrThrow("input");
    const text = input
      .getType()
      .getText(input, ts.TypeFormatFlags.NoTruncation);

    return text === "any" || text === "unknown" ? null : text;
  } finally {
    project.removeSourceFile(probe);
  }
}

function objectLiteralSchemaToType(schema: import("ts-morph").ObjectLiteralExpression): string {
  const members = schema.getProperties().flatMap((property) => {
    if (!Node.isPropertyAssignment(property)) return [];

    const name = propertyNameToText(property.getNameNode());
    const initializer = unwrapExpression(property.getInitializerOrThrow());
    return [`${name}: ${schemaValueToType(initializer)};`];
  });

  return `{ ${members.join(" ")} }`;
}

function schemaValueToType(node: Node): string {
  if (Node.isStringLiteral(node)) return primitiveSchemaToType(node.getLiteralText());
  if (Node.isObjectLiteralExpression(node)) return objectLiteralSchemaToType(node);
  if (Node.isArrayLiteralExpression(node)) {
    const [first] = node.getElements();
    return first ? schemaValueToType(first) : "unknown[]";
  }
  return "unknown";
}

function primitiveSchemaToType(value: string): string {
  if (value.endsWith("[]")) {
    return `${primitiveSchemaToType(value.slice(0, -2))}[]`;
  }

  switch (value) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
    case "undefined":
    case "null":
      return value;
    default:
      return "unknown";
  }
}

function propertyNameToText(node: Node): string {
  if (Node.isIdentifier(node)) return node.getText();
  if (Node.isStringLiteral(node) || Node.isNumericLiteral(node)) {
    return JSON.stringify(node.getLiteralText());
  }
  return node.getText();
}

function inferFunctionReturnType(fn: import("ts-morph").FunctionExpression): string {
  const returns = fn.getDescendantsOfKind(SyntaxKind.ReturnStatement);
  if (returns.length !== 1) return "unknown";

  const expression = returns[0]?.getExpression();
  if (!expression) return "void";

  return inferExpressionType(expression);
}

function inferExpressionType(expression: Node): string {
  const node = unwrapExpression(expression);

  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return "string";
  }
  if (Node.isTemplateExpression(node)) return "string";
  if (Node.isNumericLiteral(node)) return "number";
  if (node.getKind() === SyntaxKind.TrueKeyword || node.getKind() === SyntaxKind.FalseKeyword) {
    return "boolean";
  }
  if (Node.isPropertyAccessExpression(node) && node.getName() === "length") {
    return "number";
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
      return "number";
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
      return "boolean";
    }
  }
  if (Node.isArrayLiteralExpression(node)) return "unknown[]";
  if (Node.isObjectLiteralExpression(node)) return node.getText();
  if (Node.isCallExpression(node)) {
    const type = node.getType().getText();
    if (type && type !== "any") return type;
  }

  return "unknown";
}

function printAction(action: ActionSpec): string {
  if (action.steps.length === 0) {
    throw new Error(`${action.actorName}.${action.actionName} has no Step calls.`);
  }

  const className = `${action.actorName}${toPascalCase(action.actionName)}`;
  const lines: string[] = [`class ${className} {`];

  if (action.inputType) {
    lines.push(`  public input: ${action.inputType};`);
  }

  for (const step of action.steps) {
    lines.push(`  public ${step.name}!: ${step.propertyType};`);
  }

  if (action.inputType) {
    lines.push("");
    lines.push(`  constructor(input: ${action.inputType}) {`);
    lines.push("    this.input = input;");
    lines.push("  }");
  }

  for (const step of action.steps) {
    lines.push("");
    lines.push(indent(step.methodText, 2));
  }

  lines.push("");
  lines.push("  async run() {");
  for (const step of action.steps) {
    lines.push(`    this.${step.name} = await this.#${step.name}();`);
    lines.push("");
  }
  const lastStep = action.steps.at(-1)!;
  lines.push(`    return this.${lastStep.name};`);
  lines.push("  }");
  lines.push("}");
  lines.push("");

  if (action.inputType) {
    lines.push(
      `export const ${action.actionName} = (input: ${action.inputType}) =>`,
    );
    lines.push(`  new ${className}(input).run();`);
  } else {
    lines.push(`export const ${action.actionName} = () => new ${className}().run();`);
  }

  return lines.join("\n");
}

function toPascalCase(value: string): string {
  return value
    .replace(/(^|[^a-zA-Z0-9]+)([a-zA-Z0-9])/g, (_, __, char: string) =>
      char.toUpperCase(),
    )
    .replace(/[^a-zA-Z0-9]/g, "");
}

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => (line.trim() ? `${prefix}${line}` : line))
    .join("\n");
}

function normalizeBlock(value: string): string {
  const lines = value.replace(/\s+$/, "").split("\n");
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.match(/^\s*/)?.[0].length ?? 0);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

  return lines.map((line) => line.slice(minIndent)).join("\n");
}

function unwrapExpression<T extends Node>(node: T): Node {
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

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
