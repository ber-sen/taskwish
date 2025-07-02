import { Query } from "drizzle-orm";

export const useLoadQuery = <
  const T extends {
    toSQL: () => Query;
    execute: () => any;
  }
>(
  query: T
) => {
  return query.execute()
};
