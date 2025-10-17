import { TaskWish } from "./types";

export function Event<
  const Type extends string,
  const Params
>(): TaskWish.Event<Type, Params>;

export function Event<const Type extends string, const Params>(
  type: Type,
  params?: TaskWish.ValidateSchema<Params>
): TaskWish.Event<Type, TaskWish.InferInput<Params>>;

export function Event<const Type extends string, const Params>(
  action:
    | TaskWish.Action<Type, any, any, Params, any>
    | TaskWish.Runnable<Type, any, Params, any>
): TaskWish.Event<Type, Params>;

export function Event(...args: any) {
  return {};
}
