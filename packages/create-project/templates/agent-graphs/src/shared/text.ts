export function listItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

export function routeFrom(text: string): "technical" | "billing" | "general" {
  const normalized = text.trim().toLowerCase();
  if (normalized.includes("technical")) return "technical";
  if (normalized.includes("billing")) return "billing";
  return "general";
}
