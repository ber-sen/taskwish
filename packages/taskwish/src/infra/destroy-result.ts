import { TaskWish } from "../types";

export const DestroyResult = <const Params>(
  meta: Params
): TaskWish.Meta<"destroy-result", Params> => ({
  type: "destroy-result",
  meta,
  toString: () => JSON.stringify(meta),
});
