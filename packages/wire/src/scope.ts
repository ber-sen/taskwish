export type PartialScope<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: PartialScope<T[K]> }
      : T;

export function mergeScope<T>(initial: T, partial: PartialScope<NoInfer<T>>): T {
  if (!isScopeRecord(initial) || !isScopeRecord(partial)) {
    return (partial === undefined ? initial : partial) as T;
  }

  const next = { ...initial } as Record<string, unknown>;

  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) continue;

    const initialValue = next[key];
    next[key] = isScopeRecord(initialValue) && isScopeRecord(value)
      ? mergeScope(initialValue, value)
      : value;
  }

  return next as T;
}

function isScopeRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
