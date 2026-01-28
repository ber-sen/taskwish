import { InferSchema, ValidateSchema } from "../helpers";
import { Taskwish } from "../types";

interface EventUnion<Type extends string, InitialData> {
  or<const Data>(
    schema: ValidateSchema<Data>,
  ): Taskwish.EventKind<Type, InferSchema<InitialData | Data>> &
    EventUnion<Type, InitialData | Data>;
  or<const Data>(): Taskwish.EventKind<Type, InitialData | Data> &
    EventUnion<Type, InitialData | Data> & {
      end(): Taskwish.EventKind<Type, InitialData>;
    };
  end(): Taskwish.EventKind<Type, InferSchema<InitialData>>;
}

interface EventFactory<Type extends string> {
  data<const Data>(
    schema: ValidateSchema<Data>,
  ): Taskwish.EventKind<Type, InferSchema<Data>>;
  data<const Data>(): Taskwish.EventKind<Type, Data>;
  union(): {
    data<const Data>(
      schema: ValidateSchema<Data>,
    ): Taskwish.EventKind<Type, InferSchema<Data>> & EventUnion<Type, Data>;
  };
}

export function Event<
  const Action extends Taskwish.Action<any, any>,
>(): Action extends Taskwish.Action<infer Type, infer Handler>
  ? Taskwish.EventKind<Type, ReturnType<Handler>>
  : never;

export function Event<
  const Type extends string,
  const Data,
>(): Taskwish.EventKind<Type, Data>;

export function Event<const Type extends string, const Data>(
  type: Type,
): Taskwish.EventKind<Type, {}> & EventFactory<Type>;

export function Event(...args: any) {
  return {};
}
