import { getTableName, Query } from "drizzle-orm";
import { replaceParams } from "./helpers";
import alasql from "alasql";

export const useLoadQuery = <
  const T extends {
    toSQL: () => Query;
    execute: () => any;
  }
>(
  query: T
) => {
  const { sql, params } = query.toSQL();

  const raw = replaceParams(sql, [...params]).replace(
    `${(query as any).tableName}`,
    "?"
  );

  const tableName = getTableName((query as any).config.table);

  return alasql(raw.replace(`${tableName}.`, ""), [
    alasql.tables.package.data,
  ]) as Awaited<ReturnType<T["execute"]>>;
};
