import { Sica } from "../types";

export function Require<const Dep extends Sica.Typed<any>>(): {
  type<const Type extends Dep[typeof Sica.TYPE]>(
    type: Type
  ): Generator<never, Dep, Sica.RequireTyped<Dep>>;
};

export function Require<const Dep>(): {
  type<const Type extends string[]>(
    type: Type
  ): Generator<never, Dep, Sica.Require<Dep, Type>>;
};

export function Require(): {} {
  return {} as never;
}
