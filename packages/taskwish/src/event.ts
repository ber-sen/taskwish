import { TaskWish } from "./types";

interface EventOr<Type extends string, InitialData> {
  or<const Data>(
    schema: TaskWish.ValidateSchema<Data>
  ): TaskWish.Event<Type, TaskWish.InferInput<InitialData | Data>> &
    EventOr<Type, InitialData | Data>;
  or<const Data>(): TaskWish.Event<Type, InitialData | Data> &
    EventOr<Type, InitialData | Data>;
}

interface EventFactory<Type extends string> {
  data<const Data>(
    schema: TaskWish.ValidateSchema<Data>
  ): TaskWish.Event<Type, TaskWish.InferInput<Data>> & EventOr<Type, Data>;
  data<const Data>(): TaskWish.Event<Type, Data> & EventOr<Type, Data>;
}

export function Event<
  const Action extends
    | TaskWish.Runnable<any, any, any>
    | TaskWish.Action<any, any, any, any>
>(): Action extends TaskWish.Runnable<infer Type, any, infer Data>
  ? TaskWish.Event<Type, Data>
  : Action extends TaskWish.Action<infer Type, any, infer Data, any>
  ? TaskWish.Event<Type, Data>
  : never;

export function Event<const Type extends string, const Data>(): TaskWish.Event<
  Type,
  Data
>;

export function Event<const Type extends string, const Data>(
  type: Type
): TaskWish.Event<Type, {}> & EventFactory<Type>;

export function Event(...args: any) {
  return {};
}
