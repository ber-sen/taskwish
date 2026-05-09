import { InferSchema, PascalCase, ValidateSchema } from "../helpers";
import { TW } from "../core";

interface EventUnion<Name extends string, InitialData> {
  or<const Data>(
    schema: ValidateSchema<Data>,
  ): TW.EventKind<Name, InferSchema<InitialData | Data>> &
    EventUnion<Name, InitialData | Data>;
  or<const Data>(): TW.EventKind<Name, InitialData | Data> &
    EventUnion<Name, InitialData | Data> & {
      end(): TW.EventKind<Name, InitialData>;
    };
  end(): TW.EventKind<Name, InferSchema<InitialData>>;
}

interface EventFactory<Name extends string> {
  data<const Data>(schema: ValidateSchema<Data>): {
    [key in Name]: TW.EventKind<Name, InferSchema<Data>>;
  };
  data<const Data>(): TW.EventKind<Name, Data>;
  union(): {
    data<const Data>(
      schema: ValidateSchema<Data>,
    ): TW.EventKind<Name, InferSchema<Data>> & EventUnion<Name, Data>;
  };
}

export function Event<const Name extends string, const Data>(): TW.EventKind<
  Name,
  Data
>;

export function Event<const Name extends string, const Data>(
  type: PascalCase<Name>,
): EventFactory<Name>;

export function Event(...args: any) {
  return {};
}
