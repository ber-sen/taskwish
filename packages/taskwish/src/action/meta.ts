import { TaskWish } from "../types";

export const Meta = <const Type extends string, const Params>(
  type: Type,
  meta: Params
): TaskWish.Meta<Type, Params> => ({
  [TaskWish.TYPE]: type,
  meta,
  toString: () => JSON.stringify(meta),
});
