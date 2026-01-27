import { InferSchema, ValidateSchema } from "../helpers";
import { Taskwish } from "../types";

interface EventUnion<Name extends string, InitialData> {
  or<const Data>(
    schema: ValidateSchema<Data>,
  ): Taskwish.EventKind<Name, InferSchema<InitialData | Data>> &
    EventUnion<Name, InitialData | Data>;
  or<const Data>(): Taskwish.EventKind<Name, InitialData | Data> &
    EventUnion<Name, InitialData | Data> & {
      end(): Taskwish.EventKind<Name, InitialData>;
    };
  end(): Taskwish.EventKind<Name, InferSchema<InitialData>>;
}

interface EventFactory<Name extends string> {
  data<const Data>(
    schema: ValidateSchema<Data>,
  ): Taskwish.EventKind<Name, InferSchema<Data>>;
  data<const Data>(): Taskwish.EventKind<Name, Data>;
  union(): {
    data<const Data>(
      schema: ValidateSchema<Data>,
    ): Taskwish.EventKind<Name, InferSchema<Data>> & EventUnion<Name, Data>;
  };
}

export function Event<
  const Action extends Taskwish.Action<any, any>,
>(): Action extends Taskwish.Action<infer Name, infer Handler>
  ? Taskwish.EventKind<Name, ReturnType<Handler>>
  : never;

export function Event<
  const Name extends string,
  const Data,
>(): Taskwish.EventKind<Name, Data>;

export function Event<const Name extends string, const Data>(
  type: Name,
): Taskwish.EventKind<Name, {}> & EventFactory<Name>;

export function Event(...args: any) {
  return {};
}
