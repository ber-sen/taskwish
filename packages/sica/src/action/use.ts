import { Sica } from "../types";

export function Use<const Dep extends Sica.Typed<any>>(
  type: Dep[typeof Sica.TYPE]
): Generator<never, Dep, Sica.Use<Dep>> {
  return {} as never;
}
