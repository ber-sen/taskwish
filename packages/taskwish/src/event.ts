import { type } from "arktype";
import { TaskWish } from "./types";
import { StandardSchemaV1 } from "@standard-schema/spec";

export function Event<const Name extends string, const Input>(
  name: Name,
  params?: Input extends StandardSchemaV1<infer Schema>
    ? StandardSchemaV1<Schema>
    : Input extends object
    ? type.validate<Input>
    : object
): TaskWish.Event<
  Name,
  Input extends StandardSchemaV1<infer Schema>
    ? Schema
    : type.instantiate<Input>["infer"]
> {
  return {
    [TaskWish.TYPE]: name,
    params: params as Input extends StandardSchemaV1<infer Schema>
      ? Schema
      : type.instantiate<Input>["infer"],
  };
}
