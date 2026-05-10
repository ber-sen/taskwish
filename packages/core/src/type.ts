import { type } from "arktype";
import { PascalCase, Pretty, ValidateSchema } from "./helpers";
import { TW } from "./core";

export function Desc(
  strings: TemplateStringsArray,
  ...values: any[]
): "string" {
  return strings.join("") as never;
}

export type Unwrap<T> =
  T extends TW.Type<any, infer Shape>
    ? Shape
    : T extends readonly (infer U)[]
      ? Unwrap<U>[]
      : T extends object
        ? { [K in keyof T]: Unwrap<T[K]> }
        : T;

export function Type<
  const Name extends string,
  const Schema,
  Ctx extends Record<any, any>,
>(
  name: PascalCase<Name>,
  t: ValidateSchema<Schema, Ctx["scope"]>,
  description?: string,
): Pretty<
  {
    [key in Name]: TW.Type<Name, type.instantiate<Schema>["infer"]>;
  } & {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"] &
        Record<
          Name,
          TW.Type<Name, Pretty<Unwrap<type.instantiate<Schema, Ctx["scope"]>["infer"]>>>
        >;
      [TW.Step]: Ctx["step"];
      scope: Record<
        Name,
        TW.Type<Name, Pretty<Unwrap<type.instantiate<Schema, Ctx["scope"]>["infer"]>>>
      > &
        Ctx["scope"];
      last: TW.Type<
        Name,
        Pretty<Unwrap<type.instantiate<Schema, Ctx["scope"]>["infer"]>>
      >;
    };
  }
> {
  return {} as never;
}
