export function isRecord(
  value: unknown,
): value is Record<string | symbol, unknown> {
  return (
    value !== null && (typeof value === "object" || typeof value === "function")
  );
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
