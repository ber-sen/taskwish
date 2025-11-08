import { Sica } from "../types";

export function Use<const Type extends string[]>(
  type: Type
): {
  as: <const Dep>(
    dep?: Dep
  ) => Generator<never, Dep, Sica.Use<Sica.Struct<Dep, Type>>>;
};

export function Use<const Dep extends Sica.Typed<any>>(
  type: Dep[typeof Sica.TYPE]
): Generator<
  never,
  Dep extends Sica.Struct<infer Data, any> ? Data : Dep,
  Sica.Use<Dep>
>;

export function Use(...args: any[]) {
  return {} as never;
}
