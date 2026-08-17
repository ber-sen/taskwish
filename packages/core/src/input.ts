import { type, type Type as ArkType } from "arktype";

function List<const Schema>(
  ...arg: [type.validate<Schema>]
): ArkType<type.infer<Schema>[]>;

function List(...arg: [unknown]): ArkType<unknown[]> {
  return type(arg[0] as never).array() as ArkType<unknown[]>;
}

export const Input = {
  List,
};
