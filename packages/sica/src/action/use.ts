import { Sica } from "../types";

export function Use<T>(
  Cls: new (...args: any[]) => T,
  ...args: any[]
): Generator<unknown, T, T> {
  return {} as never;
}
