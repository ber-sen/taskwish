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

const BOLD_KEYS = new Set(["result", "error", "input"]);

export function formatEvent(event: object): string {
  const { ">": name, ...rest } = event as any;
  const entries = [
    `\x1b[2m">": \x1b[22m"\x1b[1m${name}\x1b[22m"`,
    ...Object.entries(rest)
      .filter(([, v]) => v !== undefined)
      .map(
        ([k, v]) =>
          `${BOLD_KEYS.has(k) ? `\x1b[2m"${k}": \x1b[22m` : `"${k}": `}${fmt(v)}`,
      ),
  ];
  return `\x1b[2m{\x1b[22m ${entries.join(", ")} \x1b[2m}\x1b[22m`;
}

export function isActionEvent(name: string): boolean {
  const parts = name.split(".");
  return parts.length === 1 || (parts.length === 2 && /^[A-Z]/.test(parts[0]));
}

export function dispatch(target: ConsoleLike): LogFn {
  return (event) => {
    if (
      event !== null &&
      typeof event === "object" &&
      ">" in (event as object)
    ) {
      const e = event as Record<string, unknown>;
      const action = isActionEvent(e[">"] as string);
      if (action && "input" in e) target.log("");
      const out = formatEvent(event as object);
      if ("error" in e) {
        target.error(out);
      } else {
        target.info(out);
      }
      if (action && ("result" in e || "error" in e)) target.log("");
    } else {
      target.log(event);
    }
  };
}

export type LoggerConfig = { [TW.Type]: "Logger"; target: ConsoleLike };

export function Logger(target: ConsoleLike = console): LoggerConfig {
  return { [TW.Type]: "Logger", target };
}

export type TypeLoggerConfig = { [TW.Type]: "TypeLogger" };

export function TypeLogger(): TypeLoggerConfig {
  return { [TW.Type]: "TypeLogger" };
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
