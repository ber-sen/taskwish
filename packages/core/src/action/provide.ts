import { Taskwish } from "../types";

export function Provide<const Dep extends Taskwish.Typed<any>>(
  dep: Dep
): Taskwish.Provide<Dep>;

export function Provide<const Type extends string[] | string, const Dep>(
  type: Type,
  dep: Dep
): Taskwish.Provide<Taskwish.Struct<Dep, Type extends string ? [Type] : Type>>;

export function Provide(...args: any[]) {
  return {} as never;
}
