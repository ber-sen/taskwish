import {
  Node,
  Project,
  ScriptTarget,
  SyntaxKind,
  ts,
  type ObjectLiteralExpression,
} from "ts-morph";

/**
 * Flatten namespace-style terminal calls for static compilers.
 *
 * Authored code keeps `Terminal.elicit(action)` so TypeScript can preserve the
 * action's generic output type. Bare output imports the function directly so
 * compilers that cannot lower method calls can include the package statically.
 */
export function morphEntrypoint(source: string): string {
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

  for (const call of sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression,
  )) {
    const expression = call.getExpression();
    if (!expression.isKind(SyntaxKind.PropertyAccessExpression)) continue;
    if (expression.getName() !== "elicit") continue;
    if (expression.getExpression().getText() !== localTerminalName) continue;

    const [action, options] = call.getArguments();
    if (!action || !Node.isObjectLiteralExpression(options)) continue;

    call.replaceWithText(
      [
        "elicit(",
        action.getText(),
        `, ${action.getText()}Metadata`,
        `, ${propertyExpression(options, "command", '"taskwish"')}`,
        `, ${propertyExpression(options, "examples", "[]")}`,
        `, ${propertyExpression(options, "formatResult", "String")}`,
        `, ${JSON.stringify(positionalInputs(options))}`,
        `, ${JSON.stringify(shortInputs(options))}`,
        ")",
      ].join(""),
    );
    break;
  }

  terminalBinding.replaceWithText("elicit");

  return sourceFile.getFullText();
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
