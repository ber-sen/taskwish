export type PartialScope<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: PartialScope<T[K]> }
      : T;

export function createScope<T>(initial: T, partial: unknown): T {
  if (!isScopeRecord(initial) || !isScopeRecord(partial)) return initial;
  return Object.assign(initial, partial);
}

export function mergeScope<T>(initial: T, partial: unknown): T {
  return createScope(initial, partial);
}

function isScopeRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
