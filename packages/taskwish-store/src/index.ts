import { drizzle } from "drizzle-orm/sqlite-proxy";
import alasql from "alasql";

export const Store = <const Schema extends Record<any, any>>({
  schema,
}: {
  schema: Schema;
}) => {
  const store = drizzle<Schema>({ schema } as any);

  function setData(table: any, data: any){
    alasql.tables[table].data = data
  }

  return {
    setData,
    store,
  };
};
