import type { Pretty } from "./types";

export class Signal<const EventType extends string, const Data> {
  readonly event = "TW::Signal";
  data: Pretty<{ "->": EventType } & Data>;

  constructor(type: EventType, data: Data) {
    this.data = Object.assign({ "->": type }, data);
  }
}

export class Trace<const EventType extends string, const Data extends object> {
  readonly event = "TW::Trace";
  data: Pretty<{ ">>": EventType } & Data>;

  constructor(type: EventType, data: Data) {
    this.data = Object.assign({ ">>": type }, data);
  }

  toJSON(): Pretty<{ ">>": EventType } & Data> {
    return this.data;
  }
}

export function eventData(event: unknown): unknown {
  return event instanceof Signal || event instanceof Trace
    ? event.data
    : event;
}
