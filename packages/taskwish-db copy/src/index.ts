import { drizzle } from "drizzle-orm/sqlite-proxy";
import alasql from "alasql";
import { replaceParams } from "./helpers";

export const Store = <const Schema extends Record<any, any>>({
  schema,
}: {
  schema: Schema;
}) => {
  const store = drizzle<typeof schema>(
    async (sql, params, method) => {
      const tableMatch = sql.match(
        /(?:FROM|INTO|UPDATE|DELETE)\s+["`]?(?<table>\w+)["`]?/i
      );
      const tableName = tableMatch?.groups?.table?.toLowerCase();

      let results = [];

      const isSelect = /^\s*SELECT\b/i.test(sql);

      const raw = isSelect
        ? replaceParams(sql, [...params]).replace(tableName, "?")
        : replaceParams(sql, [...params]);

      const rows: any[] = alasql(raw.replace(`${tableName}.`, ""), [
        alasql.tables.package.data,
      ]);

      results =
        method === "all"
          ? rows.map((item) => Object.values(item))
          : Array.isArray(rows)
          ? rows.map((item) => Object.values(item))[0]
          : rows;

      return { rows: results };
    },
    { schema: schema }
  );

  function setData(table: any, data: any) {
    alasql.tables[table].data = data;
  }

  return {
    setData,
    store,
  };
};
