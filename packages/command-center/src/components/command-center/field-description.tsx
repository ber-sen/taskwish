import type { CommandCenterInputField } from "../../types";

export function FieldDescription({
  field,
}: {
  field: CommandCenterInputField;
}) {
  if (!field.description) return null;
  return <p className="text-xs text-muted-foreground">{field.description}</p>;
}
