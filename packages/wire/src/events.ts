import type { Pretty } from "./types";

export class Signal<
  const EventType extends string = string,
  Data = Record<string, unknown>,
> {
  declare readonly event: "TW::Signal";
  declare readonly type: string;
  declare data: Pretty<{ "->": EventType } & Data>;

  constructor(type: EventType, data: Data) {
    this.event = "TW::Signal";
    this.type = type;
    this.data = Object.assign({ "->": type }, data);
  }
}

export class Trace<const EventType extends string = string, Data extends object = Record<string, unknown>> {
  declare readonly event: "TW::Trace";
  declare readonly type: string;
  declare data: Pretty<{ ">>": EventType } & Data>;

  constructor(type: EventType, data: Data) {
    this.event = "TW::Trace";
    this.type = type;
    this.data = Object.assign({ ">>": type }, data);
  }

  toJSON(): Pretty<{ ">>": EventType } & Data> {
    return this.data;
  }
}

export function eventData(event: unknown): unknown {
  return isTaskWishEvent(event) ? event.data : event;
}

function isTaskWishEvent(event: unknown): event is Signal | Trace {
  if (event === null || typeof event !== "object") return false;

  const eventType = (event as { event?: unknown }).event;

  return eventType === "TW::Signal" || eventType === "TW::Trace";
}
