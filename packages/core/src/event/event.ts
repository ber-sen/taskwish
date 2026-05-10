import { InferSchema, PascalCase } from "../helpers";
import { TW } from "../core";

export function Event<
  const Name extends string,
  const Data,
  Ctx extends Record<any, any>,
>(
  type: PascalCase<Name>,
  data: Data,
): {
  [key in Name]: TW.EventKind<Name, InferSchema<Data>>;
} & {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, TW.EventKind<Name, InferSchema<Data>>>;
    [TW.Step]: Ctx["step"];
    scope: Record<Name, TW.EventKind<Name, InferSchema<Data>>> & Ctx["scope"];
    last: Record<Name, TW.EventKind<Name, InferSchema<Data>>>;
  };
} {
  return {} as never;
}
