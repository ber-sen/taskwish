export function formatSymbol(symbol: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) return symbol;
  return `|${symbol.replaceAll("\\", "\\\\").replaceAll("|", "\\|")}|`;
}

export function valueToSmt(value: unknown): string {
  if (typeof value === "number") {
    if (value < 0) return `(- ${Math.abs(value)})`;
    return Number.isInteger(value) ? String(value) : value.toString();
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}
