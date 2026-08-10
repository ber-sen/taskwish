import { Node, SourceFile } from "ts-morph";

import { printAction, printService } from "./printer";
import type { ActionSpec, ServiceSpec, TextEdit } from "./types";

export function applyBareMetalReplacements(
  sourceText: string,
  sourceFile: SourceFile,
  actions: ActionSpec[],
  services: ServiceSpec[] = [],
): string {
  const edits: TextEdit[] = taskWishImportEdits(sourceText, sourceFile);
  const actorDeclarations = new Set<import("ts-morph").VariableStatement>();

  if (actions.length > 0) {
    const importLines: string[] = [];

    if (!hasPackageImport(sourceFile, "@taskwish/wire")) {
      importLines.push(
        `import { Trace, consume } from "@taskwish/wire";`,
      );
    }

    if (importLines.length > 0) {
      edits.push({
        start: 0,
        end: 0,
        text: `${importLines.join("\n")}\n\n`,
      });
    }
  }

  for (const action of actions) {
    edits.push({
      start: action.declaration.getStart(),
      end: action.declaration.getEnd(),
      text: printAction(action),
    });
    actorDeclarations.add(action.actorDeclaration);
  }

  for (const service of services) {
    edits.push({
      start: service.declaration.getStart(),
      end: service.declaration.getEnd(),
      text: printService(service),
    });
    actorDeclarations.add(service.actorDeclaration);
  }

  for (const statement of actorDeclarations) {
    edits.push(removeNodeEdit(sourceText, statement));
  }

  return applyTextEdits(sourceText, edits);
}

function hasPackageImport(sourceFile: SourceFile, packageName: string): boolean {
  return sourceFile
    .getImportDeclarations()
    .some(
      (importDeclaration) =>
        importDeclaration.getModuleSpecifierValue() === packageName,
    );
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

function removeNodeEdit(sourceText: string, node: Node): TextEdit {
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
