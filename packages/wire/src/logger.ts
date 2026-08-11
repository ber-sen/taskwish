import { eventData } from "./events";
import { formatEvent } from "./format";
import { Type } from "./symbols";

export type LogFn = (event: unknown) => void;

export type ConsoleLike = Pick<typeof console, "log" | "info" | "error">;

export function dispatch(target: ConsoleLike): LogFn {
  return (event) => {
    const formattedEvent = eventData(event);
    if (
      formattedEvent !== null &&
      typeof formattedEvent === "object" &&
      ("==" in (formattedEvent as object) ||
        ">>" in (formattedEvent as object) ||
        "->" in (formattedEvent as object))
    ) {
      const e = formattedEvent as Record<string, unknown>;
      const out = formatEvent(formattedEvent as object);
      if ("error" in e) {
        target.error(out);
      } else {
        target.info(out);
      }
    } else {
      target.log(event);
    }
  };
}

export type LoggerConfig = { [Type]: "Logger"; target: ConsoleLike };

export function Logger(target: ConsoleLike = console): LoggerConfig {
  return { [Type]: "Logger", target };
}
