import { TaskWish } from "./types";

export function Event<
  const Action extends
    | TaskWish.Runnable<any, any, any>
    | TaskWish.Action<any, any, any, any>
>(): Action extends TaskWish.Runnable<infer Type, any, infer Params>
  ? TaskWish.Event<Type, Params>
  : Action extends TaskWish.Action<infer Type, any, infer Params, any>
  ? TaskWish.Event<Type, Params>
  : never;

export function Event<
  const Type extends string,
  const Params
>(): TaskWish.Event<Type, Params>;

export function Event<const Type extends string, const Params>(
  type: Type,
  params?: TaskWish.ValidateSchema<Params>
): TaskWish.Event<Type, TaskWish.InferInput<Params>>;

export function Event(...args: any) {
  return {};
}
