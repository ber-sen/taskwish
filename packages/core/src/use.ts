import { TW } from "./core";

export type LogFn = (event: unknown) => void;

export type ConsoleLike = Pick<typeof console, "log" | "info" | "error">;

function fmt(val: unknown): string {
  if (val === null) return "null";
  if (val instanceof Error) return fmt({ message: val.message });
  if (typeof val !== "object") return JSON.stringify(val);
  if (Array.isArray(val)) {
    const items = val.map(fmt);
    return items.length ? `[ ${items.join(", ")} ]` : "[]";
  }
  const entries = Object.entries(val as object)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `"${k}": ${fmt(v)}`);
  return entries.length ? `{ ${entries.join(", ")} }` : "{}";
}

export function formatEvent(event: object): string {
  const { $: name, ...rest } = event as any;
  const entries = [
    `"$": "\x1b[1m${name}\x1b[0m"`,
    ...Object.entries(rest)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `"${k}": ${fmt(v)}`),
  ];
  return `{ ${entries.join(", ")} }`;
}

export function dispatch(target: ConsoleLike): LogFn {
  return (event) => {
    if (event !== null && typeof event === "object" && "$" in (event as object)) {
      const out = formatEvent(event as object);
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
