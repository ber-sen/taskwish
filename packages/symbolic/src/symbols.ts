export function formatSymbol(symbol: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) return symbol;
  return `|${symbol.replaceAll("\\", "\\\\").replaceAll("|", "\\|")}|`;
}

export function valueToSmt(value: unknown): string {
  if (typeof value === "number") {
    return numberToSmt(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function numberToSmt(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`SMT numbers must be finite, got ${value}`);
  }

  const negative = value < 0;
  const magnitude = Math.abs(value);
  const source = magnitude.toString();
  const numeral = source.includes("e")
    ? scientificNotationToSmt(source)
    : source;

  return negative ? `(- ${numeral})` : numeral;
}

function scientificNotationToSmt(source: string): string {
  const [coefficient, exponentSource] = source.split("e");
  const exponent = Number(exponentSource);
  const fractionDigits = coefficient?.split(".")[1]?.length ?? 0;
  const digits = coefficient?.replace(".", "");
  if (!digits || !Number.isInteger(exponent)) {
    throw new Error(`Cannot convert number ${source} to SMT`);
  }

  const decimalShift = exponent - fractionDigits;
  if (decimalShift >= 0) return `${digits}${"0".repeat(decimalShift)}`;
  return `(/ ${digits} 1${"0".repeat(-decimalShift)})`;
}

export function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}
