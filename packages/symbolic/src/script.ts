import { dedupeDeclarations } from "./declarations";
import { formatSymbol } from "./symbols";
import type { SmtDeclaration } from "./types";

export function buildSmtScript(input: {
  declarations: SmtDeclaration[];
  assertions: string[];
}): string {
  const declarationLines = dedupeDeclarations(input.declarations).map(
    (declaration) => {
      if (declaration.kind === "function") {
        const name = formatSymbol(declaration.name);
        return `(declare-fun ${name} (${declaration.domain.join(" ")}) ${declaration.range})`;
      }
      const name = formatSymbol(declaration.name);
      return `(declare-const ${name} ${declaration.sort})`;
    },
  );
  const assertionLines = input.assertions.map((assertion) => {
    return `(assert ${assertion})`;
  });

  return [
    ...declarationLines,
    ...assertionLines,
    "(check-sat)",
    "(get-model)",
    "",
  ].join("\n");
}
