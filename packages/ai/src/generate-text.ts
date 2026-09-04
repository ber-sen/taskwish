import { TW } from "@taskwish/core";
import type { CamelCase } from "./helpers";

export function GenerateText<
  const Name extends string,
  const Tools extends string[],
  Ctx extends Record<any, any>,
>(
  _name: CamelCase<Name>,
  _options: {
    model: string;
    instructions?: string;
    tools?: Tools;
  },
): {
  [TW.Step]: (input: Ctx) => {
    steps: Ctx["steps"] & Record<Name, Record<Name, string>>;
    step: Ctx["step"];
    scope: Record<Name, Record<Name, string>> & Ctx["scope"];
    last: Record<Name, string>;
  };
} {
  return {} as never;
}
