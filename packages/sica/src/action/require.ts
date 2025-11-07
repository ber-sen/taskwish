import { Sica } from "../types";

export function Require<const Dep extends Sica.Typed<any>>(): Generator<
  never,
  Dep,
  Sica.RequireTyped<Dep>
>;

export function Require<const Type extends string[], Dep>(
  type: Type
): {
  dep<const Dep>(): Generator<never, Dep, Sica.Require<Dep, Type>>;
};

export function Require(...args: any[]) {
  return {} as never;
}
