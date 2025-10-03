import { TaskWish } from "../types";

export const Meta = <
  const Params extends {
    type: string;
  }
>(
  meta: Params
): TaskWish.Meta<Params> => ({
  meta,
  toString: () => JSON.stringify(meta),
});
