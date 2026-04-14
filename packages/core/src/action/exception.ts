import { Taskwish } from "../core";

export const Exception = <const Status extends number, const Data>(
  status: Status,
  data?: Data
): Taskwish.Exception<Status, Data> => ({
  [Taskwish.Name]: ["exception"],
  id: null,
  threadId: null,
  status,
  data,
  throw: () => {
    throw new Error(JSON.stringify({ status, data }));
  },
});
