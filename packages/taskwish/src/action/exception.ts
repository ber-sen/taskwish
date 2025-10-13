import { TaskWish } from "../types";

export const Exception = <const Status extends number, const Params>(
  status: Status,
  exception: Params
): TaskWish.Exception<Status, Params> => ({
  status,
  exception,
  throw: () => {
    throw new Error(JSON.stringify(exception));
  },
});
