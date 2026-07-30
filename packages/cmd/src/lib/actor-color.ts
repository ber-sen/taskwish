function actorHash(actor: string): number {
  const normalized = actor.trim().toLowerCase();
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return hash;
}

const actorColors = [
  "#be123c",
  "#a21caf",
  "#0e7490",
  "#047857",
  "#4338ca",
  "#b45309",
  "#c2410c",
  "#7e22ce",
  "#0369a1",
  "#15803d",
  "#b91c1c",
  "#6d28d9",
];

export function actorColor(actor: string): string {
  const hash = actorHash(actor);
  return actorColors[hash % actorColors.length]!;
}
