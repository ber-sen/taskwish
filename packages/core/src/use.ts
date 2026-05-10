import { TW } from "./core";

export function Desc(
  strings: TemplateStringsArray,
  ...values: any[]
): "string" {
  return strings.join("") as never;
}

export function Use<
  const Ctx extends Record<any, any>,
  const Def extends Record<string, { [TW.Name]: string }>,
>(
  def: Def,
): {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];

    steps: Ctx["steps"] & {
      [K in keyof Def as Def[K][typeof TW.Name]]: Def[K];
    };

    [TW.Step]: Ctx["step"];

    scope: {
      [K in keyof Def as Def[K][typeof TW.Name]]: Def[K];
    } & Ctx["scope"];

    last: Def[keyof Def];
  };
} {
  return {} as never;
}
