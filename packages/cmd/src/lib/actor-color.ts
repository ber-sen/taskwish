function actorHash(actor: string): number {
  const normalized = actor.trim().toLowerCase();

  let hash = 0;

  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }

  return hash;
}

export function actorColor(actor: string): string {
  // 24 distinct colors
  const hue = actorHash(actor) * 7;

  return `hsl(${hue} 85% 40%)`;
}
