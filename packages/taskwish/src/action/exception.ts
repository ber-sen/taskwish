import { TaskWish } from "../types";

export const Exception = <
  const Params extends {
    status: number;
  }
>(
  exception: Params
): TaskWish.Exception<Params> => ({
  exception,
  throw: () => {
    throw new Error(JSON.stringify(exception));
  },
});
