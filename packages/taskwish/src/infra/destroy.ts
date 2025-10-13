import { TaskWish } from "../types";

export const Destroy = <const Params>(
  meta: Params
): TaskWish.Meta<"destroy", Params> => ({
  type: "destroy",
  meta,
  toString: () => JSON.stringify(meta),
});
