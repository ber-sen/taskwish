import { Sica } from "../types";

export const Exception = <const Status extends number, const Data>(
  status: Status,
  data?: Data
): Sica.Exception<Status, Data> => ({
  [Sica.Type]: ["exception"],
  id: Sica.Inject,
  threadId: Sica.Inject,
  status,
  data,
  throw: () => {
    throw new Error(JSON.stringify(data));
  },
});
