import { Query, sql } from "drizzle-orm";

export function replaceParams(sql: any, params: any) {
  let i = 0;
  return sql.replaceAll('"', "").replace(/\?/g, () => {
    if (i >= params.length) {
      throw new Error("Not enough parameters provided");
    }
    const val = params[i++];
    if (val === null || val === undefined) {
      return "NULL";
    } else if (typeof val === "number") {
      return val;
    } else if (typeof val === "boolean") {
      return val ? "TRUE" : "FALSE";
    } else if (typeof val === "string") {
      // Escape single quotes by doubling them
      return `'${val.replace(/'/g, "''")}'`;
    } else {
      throw new Error(`Unsupported parameter type: ${typeof val}`);
    }
  });
}

export function getQueryInfo<T extends Array<any>>(
  fn: (...args: T) => { toSQL: () => Query }
) {
  const paramCount = fn.length;
  const fakeArgs = Array.from({ length: paramCount }, () => sql`?`);

  return {
    key: fn(...(fakeArgs as any)).toSQL().sql,
    params: {} as T,
  };
}

