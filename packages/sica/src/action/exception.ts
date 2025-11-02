import { Sica } from "../types";

export const Exception = <const Status extends number, const Params>(
  status: Status,
  exception: Params
): Sica.Exception<Status, Params> => ({
  [Sica.TYPE]: "exception",
  status,
  exception,
  throw: () => {
    throw new Error(JSON.stringify(exception));
  },
});
