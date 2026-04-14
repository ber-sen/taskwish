import { type } from "arktype";
import { Taskwish } from "./core";

export function Desc(
  strings: TemplateStringsArray,
  ...values: any[]
): "string" {
  return strings.join("") as never;
}

export function Type<
  const Name extends string,
  const Schema,
  const Ctx extends Record<any, any>,
>(
  name: Name,
  t: type.validate<Schema>,
  description?: string,
): {
  [Taskwish.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] &
      Record<
        Name,
        Name extends keyof Ctx["step"]["map"]
          ? string
          : type.instantiate<Schema>
      >;
    [Taskwish.Step]: Ctx["step"];
    scope: Record<
      Name,
      Name extends keyof Ctx["step"]["map"] ? string : type.instantiate<Schema>
    > &
      Ctx["scope"];
    last: type.instantiate<Schema>;
  };
} {
  return {} as never;
}
