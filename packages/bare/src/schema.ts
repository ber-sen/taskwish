import { Node, ts } from "ts-morph";

import { unwrapExpression } from "./syntax";

export function inputSchemaToType(node: Node | undefined): string | null {
  if (!node) return null;
  return inferLiteralSchema(node) ?? inferArkTypeSchema(node) ?? "unknown";
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

function inferLiteralSchema(node: Node): string | null {
  const schema = unwrapExpression(node);

  if (Node.isStringLiteral(schema) || Node.isNoSubstitutionTemplateLiteral(schema)) {
    return primitiveSchemaToType(schema.getLiteralText());
  }

  if (!Node.isObjectLiteralExpression(schema)) return null;

  const properties = schema
    .getProperties()
    .flatMap((property) => {
      if (!Node.isPropertyAssignment(property)) return [];

      const name = propertyNameText(property.getNameNode());
      if (!name) return [];

      const optional = name.endsWith("?");
      const key = optional ? name.slice(0, -1) : name;
      const valueType = literalValueSchemaToType(property.getInitializerOrThrow());
      if (!valueType) return [];

      return `${key}${optional ? "?" : ""}: ${valueType}${
        optional ? " | undefined" : ""
      };`;
    });

  return properties.length > 0 ? `{ ${properties.join(" ")} }` : "{}";
}

function propertyNameText(node: Node): string | null {
  if (Node.isIdentifier(node)) return node.getText();
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralText();
  }
  return null;
}

function literalValueSchemaToType(node: Node): string | null {
  const value = unwrapExpression(node);
  if (Node.isStringLiteral(value) || Node.isNoSubstitutionTemplateLiteral(value)) {
    return primitiveSchemaToType(value.getLiteralText());
  }
  return inferLiteralSchema(value);
}

function primitiveSchemaToType(value: string): string {
  if (value.endsWith("[]")) return `${primitiveSchemaToType(value.slice(0, -2))}[]`;
  if (value === "string" || value === "number" || value === "boolean") {
    return value;
  }
  return "unknown";
}
