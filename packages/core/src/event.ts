import { InferSchema, ValidateSchema } from "./helpers";
import { Taskwish } from "./types";

type PrependEvent<T extends readonly any[]> = ["event", ...T];

type ToEvent<T extends readonly any[]> = {
  [K in keyof T]: T[K] extends "action" ? "event" : T[K];
};

interface EventUnion<InitialData, Type extends string[]> {
  or<const Data>(
    schema: ValidateSchema<Data>
  ): Taskwish.EventKind<InferSchema<InitialData | Data>, Type> &
    EventUnion<InitialData | Data, Type>;
  or<const Data>(): Taskwish.EventKind<InitialData | Data, Type> &
    EventUnion<InitialData | Data, Type> & {
      end(): Taskwish.EventKind<InitialData, Type>;
    };
  end(): Taskwish.EventKind<InferSchema<InitialData>, Type>;
}

interface EventFactory<Type extends string[]> {
  data<const Data>(
    schema: ValidateSchema<Data>
  ): Taskwish.EventKind<InferSchema<Data>, PrependEvent<Type>>;
  data<const Data>(): Taskwish.EventKind<Data, PrependEvent<Type>>;
  union(): {
    data<const Data>(
      schema: ValidateSchema<Data>
    ): Taskwish.EventKind<InferSchema<Data>, PrependEvent<Type>> &
      EventUnion<Data, PrependEvent<Type>>;
  };
}

export function Event<
  const Action extends Taskwish.NullaryAction<any, any> | Taskwish.Action<any, any>,
>(): Action extends Taskwish.NullaryAction<infer Handler, infer Type>
  ? Taskwish.EventKind<ReturnType<Handler>, ToEvent<Type>>
  : Action extends Taskwish.Action<
        infer Handler extends (parmas: any) => any,
        infer Type
      >
    ? Taskwish.EventKind<ReturnType<Handler>, ToEvent<Type>>
    : never;

export function Event<
  const Data,
  const Type extends string[] | string,
>(): Taskwish.EventKind<Data, PrependEvent<Type extends string ? [Type] : Type>>;

export function Event<const Type extends string[] | string, const Data>(
  type: Type
): Taskwish.EventKind<{}, PrependEvent<Type extends string ? [Type] : Type>> &
  EventFactory<Type extends string ? [Type] : Type>;

export function Event(...args: any) {
  return {};
}
