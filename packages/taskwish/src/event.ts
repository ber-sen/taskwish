import { type } from "arktype";
import { TaskWish } from "./types";
import { StandardSchemaV1 } from "@standard-schema/spec";

export function Event<const Type extends string, const Params>(
  type: Type,
  params?: Params extends StandardSchemaV1<infer Schema>
    ? StandardSchemaV1<Schema>
    : Params extends (...args: any) => infer Return
    ? (...args: any) => Return
    : Params extends object
    ? type.validate<Params>
    : object
): TaskWish.Event<
  Type,
  Params extends StandardSchemaV1<infer Schema>
    ? Schema
    : Params extends (...args: any) => infer Return
    ? Awaited<Return>
    : type.instantiate<Params>["infer"]
>;

export function Event<const Type extends string, const Params>(
  action:
    | TaskWish.Action<Type, any, any, Params, any>
    | TaskWish.Runnable<Type, any, Params, any>
): TaskWish.Event<Type, Params>;

export function Event(...args: any) {
  return {};
}
