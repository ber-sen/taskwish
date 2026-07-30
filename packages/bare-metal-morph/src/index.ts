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
  blockText: string;
  directExpressionText: string | null;
  useBreakBlock: boolean;
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
  const returnInfo = inferFunctionReturn(handler);
  const directExpressionText = rewriteDirectStepExpression(
    handler,
    returnInfo.shouldAwait,
  );
  const useBreakBlock = directExpressionText === null && needsBreakBlock(handler);
  const blockLabel = useBreakBlock ? `${name}Block` : null;

  return {
    name,
    propertyType: returnInfo.propertyType,
    directExpressionText,
    blockText: rewriteStepBody(
      handler,
      name,
      blockLabel,
      returnInfo.shouldAwait,
    ),
    useBreakBlock,
  };
}

function rewriteDirectStepExpression(
  handler: import("ts-morph").FunctionExpression,
  shouldAwait: boolean,
): string | null {
  const body = handler.getBody();
  if (!body || !Node.isBlock(body)) return null;

  const statements = body.getStatements();
  if (statements.length !== 1) return null;

  const statement = statements[0]!;
  if (!Node.isReturnStatement(statement)) return null;

  const expression = statement.getExpression();
  if (!expression) return null;

  const project = handler.getProject();
  const probe = project.createSourceFile(
    `${handler.getSourceFile().getDirectoryPath()}/.taskwish-morph-step-expression-${
      stepBodyProbeId++
    }.ts`,
    `function __step__() {\n  return ${expression.getText()};\n}`,
    { overwrite: true },
  );

  try {
    const fn = probe.getFunctionOrThrow("__step__");
    const rewrittenBody = fn.getBodyOrThrow();
    if (!Node.isBlock(rewrittenBody)) return null;

    const returnStatement = rewrittenBody
      .getStatements()
      .find(Node.isReturnStatement);

    if (!returnStatement) return null;

    rewriteThisPropertyAccesses(fn.getBodyOrThrow(), fn);

    const rewrittenExpression = returnStatement.getExpression();
    if (!rewrittenExpression) return null;

    return assignmentExpressionText(rewrittenExpression, shouldAwait);
  } finally {
    project.removeSourceFile(probe);
  }
}

let stepBodyProbeId = 0;

function rewriteStepBody(
  handler: import("ts-morph").FunctionExpression,
  stepName: string,
  blockLabel: string | null,
  shouldAwait: boolean,
): string {
  const bodyText = functionBodyText(handler);
  const project = handler.getProject();
  const probe = project.createSourceFile(
    `${handler.getSourceFile().getDirectoryPath()}/.taskwish-morph-step-body-${
      stepBodyProbeId++
    }.ts`,
    `function __step__() {\n${bodyText}\n}`,
    { overwrite: true },
  );

  try {
    const fn = probe.getFunctionOrThrow("__step__");
    const body = fn.getBodyOrThrow();

    rewriteThisPropertyAccesses(body, fn);

    const rewrittenBody = fn.getBodyOrThrow();
    const probeText = probe.getFullText();
    const contentStart = rewrittenBody.getStart() + 1;
    const contentEnd = rewrittenBody.getEnd() - 1;
    let contentText = probeText.slice(contentStart, contentEnd);
    const returnEdits = rewrittenBody
      .getDescendantsOfKind(SyntaxKind.ReturnStatement)
      .filter((returnStatement) => belongsToFunction(returnStatement, fn))
      .map((returnStatement) => {
        const expression = returnStatement.getExpression();
        const assignmentExpression = expression
          ? assignmentExpressionText(expression, shouldAwait)
          : "undefined";
        const lineStart =
          probeText.lastIndexOf("\n", returnStatement.getStart()) + 1;
        const indentation = probeText.slice(lineStart, returnStatement.getStart());

        return {
          start: returnStatement.getStart() - contentStart,
          end: returnStatement.getEnd() - contentStart,
          text: blockLabel
            ? `${stepName} = ${assignmentExpression};\n${indentation}break ${blockLabel};`
            : `${stepName} = ${assignmentExpression};`,
        };
      });

    for (const edit of returnEdits.sort((a, b) => b.start - a.start)) {
      contentText =
        contentText.slice(0, edit.start) +
        edit.text +
        contentText.slice(edit.end);
    }

    return normalizeBlock(contentText.replace(/^\s*\n/, ""));
  } finally {
    project.removeSourceFile(probe);
  }
}

function rewriteThisPropertyAccesses(root: Node, owner: Node): void {
  const propertyAccesses = root.getDescendantsOfKind(
    SyntaxKind.PropertyAccessExpression,
  );
  if (Node.isPropertyAccessExpression(root)) {
    propertyAccesses.unshift(root);
  }

  for (const propertyAccess of propertyAccesses.reverse()) {
    if (!belongsToFunction(propertyAccess, owner)) continue;

    const expression = unwrapExpression(propertyAccess.getExpression());
    if (!Node.isThisExpression(expression)) continue;

    propertyAccess.replaceWithText(propertyAccess.getName());
  }
}

function needsBreakBlock(fn: import("ts-morph").FunctionExpression): boolean {
  const returns = ownReturnStatements(fn);
  if (returns.length !== 1) return returns.length > 0;

  return !isDirectFinalReturn(returns[0]!, fn);
}

function ownReturnStatements(
  fn: import("ts-morph").FunctionExpression,
): import("ts-morph").ReturnStatement[] {
  return fn
    .getDescendantsOfKind(SyntaxKind.ReturnStatement)
    .filter((returnStatement) => belongsToFunction(returnStatement, fn));
}

function isDirectFinalReturn(
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

function belongsToFunction(
  node: Node,
  owner: Node,
): boolean {
  for (const ancestor of node.getAncestors()) {
    if (ancestor === owner) return true;
    if (isFunctionLikeBoundary(ancestor)) return false;
  }

  return false;
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

function awaitOperandText(expression: Node): string {
  const node = unwrapExpression(expression);

  if (
    Node.isCallExpression(node) ||
    Node.isIdentifier(node) ||
    Node.isPropertyAccessExpression(node) ||
    Node.isElementAccessExpression(node)
  ) {
    return expression.getText();
  }

  return `(${expression.getText()})`;
}

function assignmentExpressionText(expression: Node, shouldAwait: boolean): string {
  return shouldAwait && !Node.isAwaitExpression(unwrapExpression(expression))
    ? `await ${awaitOperandText(expression)}`
    : expression.getText();
}

function functionBodyText(
  fn: import("ts-morph").FunctionExpression,
): string {
  const body = fn.getBody();
  if (!body) return "";

  return normalizeBlock(body.getText().slice(1, -1).replace(/^\s*\n/, ""));
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

  const parameterText = action.inputType ? `input: ${action.inputType}` : "";
  const lines: string[] = [
    `export async function ${action.actionName}(${parameterText}) {`,
  ];

  for (const step of action.steps) {
    if (step.directExpressionText !== null) {
      lines.push(`  const ${step.name} = ${step.directExpressionText};`);
    } else {
      lines.push(`  let ${step.name}: ${step.propertyType};`);
      lines.push(step.useBreakBlock ? `  ${step.name}Block: {` : "  {");
      lines.push(indent(step.blockText, 4));
      lines.push("  }");
    }
    lines.push("");
  }

  const lastStep = action.steps.at(-1)!;
  lines.push(`  return ${lastStep.name};`);
  lines.push("}");

  return lines.join("\n");
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
