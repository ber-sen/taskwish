export type PartialScope<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: PartialScope<T[K]> }
      : T;

export function createScope<T extends object>(
  initial: T,
  partial: PartialScope<T>,
): T {
  if (partial === null || typeof partial !== "object" || Array.isArray(partial)) {
    return initial;
  }

  return Object.assign(initial, partial) as T;
}

export function mergeScope<T extends object>(
  initial: T,
  partial: PartialScope<T>,
): T {
  return createScope(initial, partial);
}
