import { Node, ts } from "ts-morph";

import { unwrapExpression } from "./syntax";

export function inputSchemaToType(node: Node | undefined): string | null {
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
