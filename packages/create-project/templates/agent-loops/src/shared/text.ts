export function listItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

export function numericScore(text: string): number {
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  return Number(match[0]);
}

export function passedEvaluation(text: string): boolean {
  return /^pass\b/i.test(text.trim());
}
