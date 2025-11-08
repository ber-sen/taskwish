import { Sica } from "./types";

type PrependEvent<T extends readonly any[]> = ["event", ...T];

type ToEvent<T extends readonly any[]> = {
  [K in keyof T]: T[K] extends "action" ? "event" : T[K];
};

interface EventUnion<InitialData, Type extends string[]> {
  or<const Data>(
    schema: Sica.ValidateSchema<Data>
  ): Sica.EventFactory<Sica.InferInput<InitialData | Data>, Type> &
    EventUnion<InitialData | Data, Type>;
  or<const Data>(): Sica.EventFactory<InitialData | Data, Type> &
    EventUnion<InitialData | Data, Type> & {
      end(): Sica.EventFactory<InitialData, Type>;
    };
  end(): Sica.EventFactory<Sica.InferInput<InitialData>, Type>;
}

interface EventFactory<Type extends string[]> {
  data<const Data>(
    schema: Sica.ValidateSchema<Data>
  ): Sica.EventFactory<Sica.InferInput<Data>, PrependEvent<Type>>;
  data<const Data>(): Sica.EventFactory<Data, PrependEvent<Type>>;
  union(): {
    data<const Data>(
      schema: Sica.ValidateSchema<Data>
    ): Sica.EventFactory<Sica.InferInput<Data>, PrependEvent<Type>> &
      EventUnion<Data, PrependEvent<Type>>;
  };
}

export function Event<
  const Action extends Sica.NullaryAction<any, any> | Sica.Action<any, any>,
>(): Action extends Sica.NullaryAction<infer Handler, infer Type>
  ? Sica.EventFactory<ReturnType<Handler>, ToEvent<Type>>
  : Action extends Sica.Action<
        infer Handler extends (parmas: any) => any,
        infer Type
      >
    ? Sica.EventFactory<ReturnType<Handler>, ToEvent<Type>>
    : never;

export function Event<
  const Data,
  const Type extends string[] | string,
>(): Sica.EventFactory<Data, PrependEvent<Type extends string ? [Type] : Type>>;

export function Event<const Type extends string[] | string, const Data>(
  type: Type
): Sica.EventFactory<{}, PrependEvent<Type extends string ? [Type] : Type>> &
  EventFactory<Type extends string ? [Type] : Type>;

export function Event(...args: any) {
  return {};
}
