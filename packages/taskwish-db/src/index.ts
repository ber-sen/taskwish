import {
  Column,
  GetColumnData,
  InferInsertModel,
  Table,
  TableConfig,
} from "drizzle-orm";
import * as schema from "./schema";

type TableKeys<T> = {
  [K in keyof T]: T[K] extends Table<TableConfig<Column<any, object, object>>>
    ? K
    : never;
}[keyof T];

export type UpdateKeys<T extends Table> = {
  [Key in keyof T["$inferInsert"]]?:
    | GetColumnData<T["_"]["columns"][Key]>
    | undefined;
} & {};

type SelectQuery<Schema, TableName extends TableKeys<Schema>> = {
  select: "*";
  from?: TableName;
  where?: Array<
    | "and"
    | [
        { __brand: "literal" } | "user.id" | "user.score",
        "eq" | "gte",
        { __brand: "literal" } | "user.id" | "user.score"
      ]
  >;
};

type InsertQuery<Schema, TableName extends TableKeys<Schema>> = {
  insert: TableName;
  values: Schema[TableName] extends Table<
    TableConfig<Column<any, object, object>>
  >
    ?
        | InferInsertModel<Schema[TableName]>
        | Array<InferInsertModel<Schema[TableName]>>
    : never;
};

type UpdateQuery<Schema, TableName extends TableKeys<Schema>> = {
  update: TableName;
  set: Schema[TableName] extends Table<TableConfig<Column<any, object, object>>>
    ? UpdateKeys<Schema[TableName]>
    : never;
};

export const Database = <const Schema>({ schema }: { schema: Schema }) => {
  function query<
    const TableName extends TableKeys<Schema>,
    T extends
      | {
          select: "*";
          /**
           * @deprecated
           */
          insert?: undefined;
          /**
           * @deprecated
           */
          update?: never;
        }
      | {
          insert: TableName;
          /**
           * @deprecated
           */
          select?: never;
          /**
           * @deprecated
           */
          update?: never;
        }
      | {
          update: TableName;
          /**
           * @deprecated
           */
          select?: never;
          /**
           * @deprecated
           */
          insert?: never;
        }
  >(
    params: T["insert"] extends string
      ? InsertQuery<Schema, TableName>
      : T["select"] extends string
      ? SelectQuery<Schema, TableName>
      : T["update"] extends string
      ? UpdateQuery<Schema, TableName>
      : T
  ) {
    return 3;
  }

  return query;
};

const db = Database({ schema });

const literal = <const v>(value: v) => {
  return {} as v & { __brand: "literal" };
};

const query = db({
  select: "*",
  from: "users",
  where: [
    ["user.id", "eq", literal(3)],
    "and",
    ["user.score", "gte", literal(2)],
  ],
});

const insert = db({
  insert: "posts",
  values: {
    title: "asda",
    authorId: 1,
    content: "",
  },
});

const update = db({
  update: "posts",
  set: {
    content: "asd",
  },
});
