import { dedupeDeclarations } from "./declarations";
import { formatSymbol } from "./symbols";
import type { SmtDeclaration } from "./types";

export function buildSmtScript(input: {
  declarations: SmtDeclaration[];
  assertions: string[];
}): string {
  const declarationLines = dedupeDeclarations(input.declarations).map(
    ({ name, sort }) => `(declare-const ${formatSymbol(name)} ${sort})`,
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
