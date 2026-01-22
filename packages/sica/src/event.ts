import { InferSchema, ValidateSchema } from "./helpers";
import { Sica } from "./types";

type PrependEvent<T extends readonly any[]> = ["event", ...T];

type ToEvent<T extends readonly any[]> = {
  [K in keyof T]: T[K] extends "action" ? "event" : T[K];
};

interface EventUnion<InitialData, Type extends string[]> {
  or<const Data>(
    schema: ValidateSchema<Data>
  ): Sica.EventKind<InferSchema<InitialData | Data>, Type> &
    EventUnion<InitialData | Data, Type>;
  or<const Data>(): Sica.EventKind<InitialData | Data, Type> &
    EventUnion<InitialData | Data, Type> & {
      end(): Sica.EventKind<InitialData, Type>;
    };
  end(): Sica.EventKind<InferSchema<InitialData>, Type>;
}

interface EventFactory<Type extends string[]> {
  data<const Data>(
    schema: ValidateSchema<Data>
  ): Sica.EventKind<InferSchema<Data>, PrependEvent<Type>>;
  data<const Data>(): Sica.EventKind<Data, PrependEvent<Type>>;
  union(): {
    data<const Data>(
      schema: ValidateSchema<Data>
    ): Sica.EventKind<InferSchema<Data>, PrependEvent<Type>> &
      EventUnion<Data, PrependEvent<Type>>;
  };
}

export function Event<
  const Action extends Sica.NullaryAction<any, any> | Sica.Action<any, any>,
>(): Action extends Sica.NullaryAction<infer Handler, infer Type>
  ? Sica.EventKind<ReturnType<Handler>, ToEvent<Type>>
  : Action extends Sica.Action<
        infer Handler extends (parmas: any) => any,
        infer Type
      >
    ? Sica.EventKind<ReturnType<Handler>, ToEvent<Type>>
    : never;

export function Event<
  const Data,
  const Type extends string[] | string,
>(): Sica.EventKind<Data, PrependEvent<Type extends string ? [Type] : Type>>;

export function Event<const Type extends string[] | string, const Data>(
  type: Type
): Sica.EventKind<{}, PrependEvent<Type extends string ? [Type] : Type>> &
  EventFactory<Type extends string ? [Type] : Type>;

export function Event(...args: any) {
  return {};
}
