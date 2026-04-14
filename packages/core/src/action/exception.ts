import { TW } from "../core";

export const Exception = <const Status extends number, const Data>(
  status: Status,
  data?: Data
): TW.Exception<Status, Data> => ({
  [TW.Name]: ["exception"],
  id: null,
  threadId: null,
  status,
  data,
  throw: () => {
    throw new Error(JSON.stringify({ status, data }));
  },
});
