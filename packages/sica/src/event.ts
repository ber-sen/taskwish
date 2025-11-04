import { Sica } from "./types";

interface EventOr<Type extends string, InitialData> {
  or<const Data>(
    schema: Sica.ValidateSchema<Data>
  ): Sica.Event<Type, Sica.InferInput<InitialData | Data>> &
    EventOr<Type, InitialData | Data>;
  or<const Data>(): Sica.Event<Type, InitialData | Data> &
    EventOr<Type, InitialData | Data>;
}

interface EventFactory<Type extends string> {
  data<const Data>(
    schema: Sica.ValidateSchema<Data>
  ): Sica.Event<Type, Sica.InferInput<Data>> & EventOr<Type, Data>;
  data<const Data>(): Sica.Event<Type, Data> & EventOr<Type, Data>;
}

export function Event<
  const Action extends
    | Sica.Runnable<any, any, any>
    | Sica.Action<any, any, any>
>(): Action extends Sica.Runnable<infer Type, any, infer Data>
  ? Sica.Event<Type, Data>
  : Action extends Sica.Action<infer Type, any, infer Data, any>
  ? Sica.Event<Type, Data>
  : never;

export function Event<const Type extends string, const Data>(): Sica.Event<
  Type,
  Data
>;

export function Event<const Type extends string, const Data>(
  type: Type
): Sica.Event<Type, {}> & EventFactory<Type>;

export function Event(...args: any) {
  return {};
}
