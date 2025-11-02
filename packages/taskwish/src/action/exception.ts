import { TaskWish } from "../types";

export const Exception = <const Status extends number, const Params>(
  status: Status,
  exception: Params
): TaskWish.Exception<Status, Params> => ({
  [TaskWish.TYPE]: "exception",
  status,
  exception,
  throw: () => {
    throw new Error(JSON.stringify(exception));
  },
});
