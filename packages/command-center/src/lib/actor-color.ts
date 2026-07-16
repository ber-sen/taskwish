function actorHash(actor: string): number {
  const normalized = actor.trim().toLowerCase();
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function actorColor(actor: string): string {
  const hash = actorHash(actor);
  const hue = hash % 360;
  const saturation = 72;
  const lightness = 48;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
