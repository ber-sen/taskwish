import { TW } from "./core";

export type LogFn = (event: unknown) => void;

export type ConsoleLike = Pick<typeof console, "log" | "info" | "error">;

export function dispatch(target: ConsoleLike): LogFn {
  return (event) => {
    if (event !== null && typeof event === "object" && "$" in (event as object)) {
      const ev = event as any;
      const line = JSON.stringify(event, (_, val) => val instanceof Error ? { message: val.message } : val);
      const isActionStart = ev.$ === "Action" && "input" in (event as object);
      const isActionEnd = ev.$ === "Action" && !isActionStart;
      const out = (isActionStart ? "\n" : "") + line + (isActionEnd ? "\n" : "");
      if ("error" in (event as object)) {
        target.error(out);
      } else {
        target.info(out);
      }
    } else {
      target.log(event);
    }
  };
}

export type LoggerConfig = { [TW.Type]: "Logger"; target: ConsoleLike };

export function Logger(target: ConsoleLike = console): LoggerConfig {
  return { [TW.Type]: "Logger", target };
}

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
