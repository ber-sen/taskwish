import type { ConsoleInputField } from "../../types";

export function FieldDescription({ field }: { field: ConsoleInputField }) {
  if (!field.description) return null;
  return <p className="text-xs text-muted-foreground">{field.description}</p>;
}
