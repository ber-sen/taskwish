import { Inject } from "../inject";
import { Sica } from "../types";

export const Exception = <const Status extends number, const Data>(
  status: Status,
  data?: Data
): Sica.Exception<Status, Data> => ({
  [Sica.Type]: ["exception"],
  id: Inject,
  threadId: Inject,
  status,
  data,
  throw: () => {
    throw new Error(JSON.stringify({ status, data }));
  },
});
