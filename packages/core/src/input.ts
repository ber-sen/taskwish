import { type, type Type as ArkType } from "arktype";

export function List<const Schema>(
  ...arg: [type.validate<Schema>]
): ArkType<type.infer<Schema>[]>;

export function List(...arg: [unknown]): ArkType<unknown[]> {
  return type(arg[0] as never).array() as ArkType<unknown[]>;
}
