import { type } from "arktype";
import { PascalCase } from "./helpers";
import { TW } from "./core";

export function Desc(
  strings: TemplateStringsArray,
  ...values: any[]
): "string" {
  return strings.join("") as never;
}

export function Type<const Name extends string, const Schema>(
  name: PascalCase<Name>,
  t: type.validate<Schema>,
  description?: string,
): {
  [key in Name]: TW.Type<Name, type.instantiate<Schema>["infer"]>;
} {
  return {} as never;
}
