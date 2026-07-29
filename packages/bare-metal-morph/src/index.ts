import {
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
  actorDeclaration: import("ts-morph").VariableStatement;
  declaration: import("ts-morph").VariableStatement;
  steps: StepSpec[];
};

type StepSpec = {
  name: string;
  propertyType: string;
  methodText: string;
  shouldAwait: boolean;
};

type FunctionReturnInfo = {
  propertyType: string;
  shouldAwait: boolean;
};

type TextEdit = {
  start: number;
  end: number;
  text: string;
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

  return applyBareMetalReplacements(sourceText, sourceFile, actions).trim();
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
      actorDeclaration: actor.declaration,
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

function applyBareMetalReplacements(
  sourceText: string,
  sourceFile: SourceFile,
  actions: ActionSpec[],
): string {
  const edits: TextEdit[] = taskWishImportEdits(sourceText, sourceFile);
  const actorDeclarations = new Set<import("ts-morph").VariableStatement>();

  for (const action of actions) {
    edits.push({
      start: action.declaration.getStart(),
      end: action.declaration.getEnd(),
      text: printAction(action),
    });
    actorDeclarations.add(action.actorDeclaration);
  }

  for (const statement of actorDeclarations) {
    edits.push(removeNodeEdit(sourceText, statement));
  }

  return applyTextEdits(sourceText, edits);
}

function taskWishImportEdits(
  sourceText: string,
  sourceFile: SourceFile,
): TextEdit[] {
  const edits: TextEdit[] = [];

  for (const importDeclaration of sourceFile.getImportDeclarations()) {
    const namedImports = importDeclaration.getNamedImports();
    const remainingImports = namedImports.filter((namedImport) => {
      const name = namedImport.getName();
      return name !== "Actor" && name !== "Step";
    });

    if (remainingImports.length === namedImports.length) continue;

    if (
      remainingImports.length === 0 &&
      !importDeclaration.getDefaultImport() &&
      !importDeclaration.getNamespaceImport()
    ) {
      edits.push(removeNodeEdit(sourceText, importDeclaration));
      continue;
    }

    if (remainingImports.length > 0) {
      edits.push({
        start: namedImports[0]!.getStart(),
        end: namedImports.at(-1)!.getEnd(),
        text: remainingImports
          .map((namedImport) => namedImport.getText())
          .join(", "),
      });
    }
  }

  return edits;
}

function removeNodeEdit(
  sourceText: string,
  node: Node,
): TextEdit {
  let end = node.getEnd();

  while (end < sourceText.length && /\s/.test(sourceText[end] ?? "")) {
    end++;
  }

  return {
    start: node.getStart(),
    end,
    text: "",
  };
}

function applyTextEdits(sourceText: string, edits: TextEdit[]): string {
  const orderedEdits = [...edits].sort((a, b) => b.start - a.start);
  let output = sourceText;

  for (const edit of orderedEdits) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }

  return output;
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
  const returnInfo = inferFunctionReturn(handler);

  return {
    name,
    propertyType: returnInfo.propertyType,
    methodText: `${handler.isAsync() ? "async " : ""}#${name}() {\n${indent(
      bodyText,
      2,
    )}\n}`,
    shouldAwait: returnInfo.shouldAwait,
  };
}

function inputSchemaToType(node: Node | undefined): string | null {
  if (!node) return null;
  return inferArkTypeSchema(node) ?? "unknown";
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

function inferFunctionReturn(
  fn: import("ts-morph").FunctionExpression,
): FunctionReturnInfo {
  const returns = fn.getDescendantsOfKind(SyntaxKind.ReturnStatement);
  if (returns.length !== 1) {
    return {
      propertyType: "unknown",
      shouldAwait: fn.isAsync(),
    };
  }

  const expression = returns[0]?.getExpression();
  if (!expression) {
    return {
      propertyType: "void",
      shouldAwait: fn.isAsync(),
    };
  }

  const returnInfo = inferExpressionReturn(expression);
  const shouldAwait = fn.isAsync() || returnInfo.shouldAwait;

  return {
    propertyType: shouldAwait
      ? returnInfo.awaitedType ?? returnInfo.propertyType
      : returnInfo.propertyType,
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
  if (node.getKind() === SyntaxKind.TrueKeyword || node.getKind() === SyntaxKind.FalseKeyword) {
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

function typeToText(
  type: import("ts-morph").Type,
  node: Node,
): string {
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

function printAction(action: ActionSpec): string {
  if (action.steps.length === 0) {
    throw new Error(`${action.actorName}.${action.actionName} has no Step calls.`);
  }

  const className = `${action.actorName}${toPascalCase(action.actionName)}Action`;
  const lines: string[] = [`class ${className} {`];

  if (action.inputType) {
    lines.push(`  public input: ${action.inputType};`);
  }

  for (const step of action.steps) {
    lines.push(`  declare public ${step.name}: ${step.propertyType};`);
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
    const invocation = `this.#${step.name}()`;
    lines.push(
      `    this.${step.name} = ${step.shouldAwait ? `await ${invocation}` : invocation};`,
    );
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
