import {
  Node,
  Project,
  ScriptTarget,
  SyntaxKind,
  ts,
  type ObjectLiteralExpression,
} from "ts-morph";

import { TERMINAL_RUNTIME } from "./terminal-runtime";

export type BareEntrypointAction = {
  expression: string;
  inputType: string | null;
  outputType: string;
  metadataText: string;
};

export type MorphEntrypointOptions = {
  actions?: readonly BareEntrypointAction[];
};

/**
 * Replace namespace-style terminal calls with a self-contained CLI runtime.
 *
 * Authored code keeps `Terminal.elicit(action)` so TypeScript can preserve the
 * action's generic output type. Bare output owns parsing, prompting, and
 * invocation, and links only the logo renderer from the terminal package.
 */
export function morphEntrypoint(
  source: string,
  transformOptions: MorphEntrypointOptions = {},
): string {
  const project = new Project({
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ScriptTarget.ESNext,
    },
  });
  const sourceFile = project.createSourceFile("entrypoint.ts", source);
  const terminalImport = sourceFile
    .getImportDeclarations()
    .find(
      (declaration) =>
        declaration.getModuleSpecifierValue() === "@taskwish/terminal",
    );
  const terminalBinding = terminalImport
    ?.getNamedImports()
    .find((namedImport) => namedImport.getName() === "Terminal");

  if (!terminalImport || !terminalBinding) return source;

  const localTerminalName =
    terminalBinding.getAliasNode()?.getText() ?? terminalBinding.getName();
  let transformed = false;

  for (const call of sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression,
  )) {
    const expression = call.getExpression();
    if (!expression.isKind(SyntaxKind.PropertyAccessExpression)) continue;
    if (expression.getName() !== "elicit") continue;
    if (expression.getExpression().getText() !== localTerminalName) continue;

    const [action, terminalOptions] = call.getArguments();
    if (!action || !Node.isObjectLiteralExpression(terminalOptions)) continue;
    const actionInfo = optionsForAction(
      action.getText(),
      transformOptions.actions ?? [],
    );

    call.replaceWithText(
      terminalInvocation(action.getText(), actionInfo, terminalOptions),
    );
    transformed = true;
    break;
  }

  if (!transformed) return source;

  terminalImport.addNamedImport("taskwishLogo");
  terminalBinding.remove();
  sourceFile.addImportDeclaration({
    moduleSpecifier: "node:readline",
    namedImports: ["createInterface"],
  });

  const statements = sourceFile.getStatements();
  const lastImportIndex = statements.reduce(
    (index, statement, statementIndex) =>
      Node.isImportDeclaration(statement) ? statementIndex : index,
    -1,
  );
  sourceFile.insertStatements(lastImportIndex + 1, TERMINAL_RUNTIME);

  return sourceFile.getFullText();
}

function optionsForAction(
  expression: string,
  actions: readonly BareEntrypointAction[],
): BareEntrypointAction {
  const action = actions.find((candidate) => candidate.expression === expression);
  if (!action) {
    throw new Error(
      `No inline bare metadata was supplied for Terminal.elicit action ${expression}.`,
    );
  }
  return action;
}

function terminalInvocation(
  action: string,
  actionInfo: BareEntrypointAction,
  options: ObjectLiteralExpression,
): string {
  const fields = terminalFields(
    actionInfo.metadataText,
    positionalInputs(options),
    shortInputs(options),
  );
  const invocation = actionInvocation(actionInfo.inputType);

  return `void (async () => {
  const __taskwishAction = ${action};
  const __taskwishMetadata = ${actionInfo.metadataText};
  const __taskwishOptions: __TaskwishTerminalOptions<typeof __taskwishAction> = {
    command: ${propertyExpression(options, "command", '"taskwish"')},
    examples: ${propertyExpression(options, "examples", "[]")},
    formatResult: ${propertyExpression(options, "formatResult", "String")},
    positionalInputs: ${JSON.stringify(positionalInputs(options))},
    shortInputs: ${JSON.stringify(shortInputs(options))},
  };

  try {
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    if (interactive) process.stdout.write(taskwishLogo(__taskwishUseColor()));
    const fields: __TaskwishTerminalField[] = ${fields};
    const parsed = __taskwishArguments(process.argv.slice(2), fields);
    if (parsed.help) {
      process.stdout.write(__taskwishHelp(__taskwishMetadata.meta.description, fields, __taskwishOptions.command, __taskwishOptions.examples));
      return;
    }
    if (parsed.yes) {
      for (const field of fields) if (!field.elicit.hidden && parsed.values[field.name] === undefined && field.elicit.default !== undefined) parsed.values[field.name] = field.elicit.default;
    } else if (interactive) {
      const title = __taskwishMetadata.meta.elicit?.title ?? __taskwishMetadata.meta.description ?? "Run action";
      await __taskwishPrompt(parsed.values, fields, title);
    }
    else {
      const missing = fields.filter((field) => !field.elicit.hidden && parsed.values[field.name] === undefined);
      if (missing.length) throw new Error("Missing " + missing.map(__taskwishLabel).join(", ") + ". Pass --yes to accept defaults or provide all options.");
    }
    const required = fields.filter((field) => !field.elicit.hidden && !field.optional && parsed.values[field.name] === undefined);
    if (required.length) throw new Error("Missing " + required.map(__taskwishLabel).join(", ") + ".");
    const result = await ${invocation};
    const formatted = String(__taskwishOptions.formatResult(result));
    const [first = "Done", ...rest] = formatted.split("\\n");
    process.stdout.write(__taskwishPaint("90", "\\u2502") + "\\n" + __taskwishPaint("30", "\\u2514") + "  " + __taskwishPaint(__TASKWISH_ACCENT, first) + "\\n");
    if (rest.length) process.stdout.write(rest.join("\\n") + "\\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write("\\n" + __taskwishPaint("31", "\\u25a0") + "  " + message + "\\n");
    process.exit(1);
  }
})()`;
}

function actionInvocation(inputType: string | null): string {
  if (!inputType) return "__taskwishAction()";

  const project = new Project({
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ScriptTarget.ESNext,
    },
  });
  const sourceFile = project.createSourceFile(
    "terminal-action-input.ts",
    `type Input = ${inputType};`,
  );
  const type = sourceFile.getTypeAliasOrThrow("Input").getTypeNode();
  if (!type || !Node.isTypeLiteral(type)) {
    return `__taskwishAction(parsed.values as ${inputType})`;
  }

  const properties = type.getProperties().map((property) => {
    const name = property.getName();
    const propertyType = property.getTypeNode()?.getText() ?? "unknown";
    return `${JSON.stringify(name)}: parsed.values[${JSON.stringify(name)}] as ${propertyType}`;
  });

  return `__taskwishAction({ ${properties.join(", ")} })`;
}

function terminalFields(
  metadataText: string,
  positional: readonly string[],
  shorts: readonly string[],
): string {
  const project = new Project({
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ScriptTarget.ESNext,
    },
  });
  const sourceFile = project.createSourceFile(
    "terminal-metadata.ts",
    `const metadata = ${metadataText};`,
  );
  const metadata = sourceFile
    .getVariableDeclarationOrThrow("metadata")
    .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  const meta = objectProperty(metadata, "meta");
  const input = meta ? objectProperty(meta, "input") : undefined;
  const schema = objectProperty(metadata, "inputSchema");
  const names: string[] = [];

  for (const property of input?.getProperties() ?? []) {
    if (Node.isSpreadAssignment(property)) continue;
    const name = objectPropertyName(property);
    if (!names.includes(name)) names.push(name);
  }
  for (const property of schema?.getProperties() ?? []) {
    if (Node.isSpreadAssignment(property)) continue;
    const name = objectPropertyName(property).replace(/\?$/, "");
    if (!names.includes(name)) names.push(name);
  }

  const values = names.map((name) => {
    const requiredSchema = propertyInitializer(schema, name);
    const optionalSchema = propertyInitializer(schema, `${name}?`);
    const inputValue = propertyInitializerNode(input, name);
    let description = "undefined";
    let elicit = "{}";

    if (inputValue && Node.isStringLiteral(inputValue)) {
      description = inputValue.getText();
    } else if (inputValue && Node.isObjectLiteralExpression(inputValue)) {
      description =
        propertyInitializer(inputValue, "description") ?? "undefined";
      elicit = propertyInitializer(inputValue, "elicit") ?? "{}";
    }

    const shortIndex = shorts.indexOf(name);
    return `{
      name: ${JSON.stringify(name)},
      schema: ${requiredSchema ?? optionalSchema ?? "undefined"},
      optional: ${requiredSchema === undefined},
      description: ${description},
      elicit: ${elicit},
      position: ${positional.indexOf(name)},
      short: ${shortIndex < 0 ? "undefined" : JSON.stringify(shorts[shortIndex + 1])},
    }`;
  });

  return `[${values.join(",\n")}]`;
}

function objectProperty(
  object: ObjectLiteralExpression,
  name: string,
): ObjectLiteralExpression | undefined {
  const initializer = propertyInitializerNode(object, name);
  return initializer && Node.isObjectLiteralExpression(initializer)
    ? initializer
    : undefined;
}

function propertyInitializer(
  object: ObjectLiteralExpression | undefined,
  name: string,
): string | undefined {
  return propertyInitializerNode(object, name)?.getText();
}

function propertyInitializerNode(
  object: ObjectLiteralExpression | undefined,
  name: string,
): Node | undefined {
  const property = object
    ?.getProperties()
    .find(
      (candidate) =>
        !Node.isSpreadAssignment(candidate) &&
        objectPropertyName(candidate) === name,
    );
  return Node.isPropertyAssignment(property)
    ? property.getInitializer()
    : undefined;
}

function objectPropertyName(
  property: { getNameNode(): Node; getName(): string },
): string {
  const name = property.getNameNode();
  return Node.isStringLiteral(name) || Node.isNumericLiteral(name)
    ? String(name.getLiteralValue())
    : property.getName();
}

function propertyExpression(
  object: ObjectLiteralExpression,
  name: string,
  fallback: string,
): string {
  const property = object.getProperty(name);
  if (!property) return fallback;

  if (Node.isPropertyAssignment(property)) {
    return property.getInitializer()?.getText() ?? fallback;
  }
  if (Node.isShorthandPropertyAssignment(property)) return property.getText();
  if (Node.isMethodDeclaration(property)) {
    const asyncPrefix = property.isAsync() ? "async " : "";
    const parameters = property
      .getParameters()
      .map((parameter) => parameter.getText())
      .join(", ");
    return `${asyncPrefix}function (${parameters}) ${property.getBodyText() === undefined ? "{}" : `{${property.getBodyText()}}`}`;
  }

  return fallback;
}

function inputObject(
  options: ObjectLiteralExpression,
): ObjectLiteralExpression | undefined {
  const property = options.getProperty("input");
  if (!Node.isPropertyAssignment(property)) return undefined;
  const initializer = property.getInitializer();
  return Node.isObjectLiteralExpression(initializer) ? initializer : undefined;
}

function positionalInputs(options: ObjectLiteralExpression): string[] {
  const inputs = inputObject(options);
  if (!inputs) return [];

  return inputs
    .getProperties()
    .flatMap((property, index) => {
      if (!Node.isPropertyAssignment(property)) return [];
      const value = property.getInitializer();
      if (!Node.isObjectLiteralExpression(value)) return [];
      const positional = value.getProperty("positional");
      if (!Node.isPropertyAssignment(positional)) return [];
      const initializer = positional.getInitializer();
      if (!initializer || initializer.getText() === "false") return [];
      const order = Node.isNumericLiteral(initializer)
        ? Number(initializer.getLiteralValue())
        : index;
      return [{ name: property.getName(), order }];
    })
    .sort((left, right) => left.order - right.order)
    .map(({ name }) => name);
}

function shortInputs(options: ObjectLiteralExpression): string[] {
  const inputs = inputObject(options);
  if (!inputs) return [];

  return inputs.getProperties().flatMap((property) => {
    if (!Node.isPropertyAssignment(property)) return [];
    const value = property.getInitializer();
    if (!Node.isObjectLiteralExpression(value)) return [];
    const short = value.getProperty("short");
    if (!Node.isPropertyAssignment(short)) return [];
    const initializer = short.getInitializer();
    if (!Node.isStringLiteral(initializer)) return [];
    return [property.getName(), initializer.getLiteralValue()];
  });
}
