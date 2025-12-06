import { Boria } from "./types";
import { Sica } from "../types";
import { Pretty } from "../helpers";

export function Part<const Schema>(
  content: Sica.ValidateSchema<Schema>
): <const Params extends Omit<Sica.InferSchema<Schema>, "type">>(
  params: Params
) => Sica.InferSchema<Schema> extends { type: any }
  ? Pretty<Boria.Part<{ type: Sica.InferSchema<Schema>["type"] } & Params>>
  : never;

export function Part<const Type extends string>(
  key: Type
): <const Param>(
  params: Param
) => Pretty<Boria.Part<{ type: Type } & { [K in Type]: Param }>>;

export function Part() {
  return {} as never;
}
