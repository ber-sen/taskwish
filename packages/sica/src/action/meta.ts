import { Sica } from "../types";

export const Meta = <const Type extends string, const Params>(
  name: Type,
  meta: Params
): Sica.Meta<Type, Params> => ({
  [Sica.TYPE]: "meta",
  [Sica.NAME]: name,
  meta,
  toString: () => JSON.stringify(meta),
});
