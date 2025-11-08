import { Sica } from "../types";

export function Provide<const Dep extends Sica.Typed<any>>(
  dep: Dep
): Sica.Provide<Dep>;

export function Provide<const Type extends string[] | string, const Dep>(
  type: Type,
  dep: Dep
): Sica.Provide<Sica.Struct<Dep, Type extends string ? [Type] : Type>>;

export function Provide(...args: any[]) {
  return {} as never;
}
