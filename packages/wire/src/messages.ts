import type { Pretty } from "./types";

export class Message<
  const MessageType extends string = string,
  Data = unknown
> {
  constructor(public readonly message: MessageType, public data: Data) {}
}

export class Signal<
  const EventType extends string = string,
  Data = Record<string, unknown>
> extends Message<"TW::Signal", Pretty<{ "->": EventType } & Data>> {
  declare readonly event: EventType;

  constructor(event: EventType, data: Data) {
    super("TW::Signal", Object.assign({ "->": event }, data));
    this.event = event;
  }
}

export class Trace<
  const Path extends string = string,
  Data extends object = Record<string, unknown>
> extends Message<"TW::Trace", Pretty<{ ">>": Path } & Data>> {
  declare readonly path: Path;

  constructor(path: Path, data: Data) {
    super("TW::Trace", Object.assign({ ">>": path }, data));
    this.path = path;
  }

  toJSON(): Pretty<{ ">>": Path } & Data> {
    return this.data;
  }
}

export class Stream<const Data> extends Message<"TW::Stream", Data> {
  constructor(data: Data) {
    super("TW::Stream", data);
  }
}

/** A structured description of an actor-state mutation. */
export class StateChange<const Data = unknown> extends Message<
  "TW::StateChange",
  Data
> {
  constructor(data: Data, public readonly path?: string) {
    super("TW::StateChange", data);
  }

  toJSON(): Pretty<Data> {
    return this.data
  }
}

export function messageData(message: unknown): unknown {
  return isTaskWishMessage(message) ? message.data : message;
}

/** @deprecated Use messageData instead. */
export const eventData = messageData;

type LoggableTaskWishMessage = Signal | Trace | StateChange;

function isTaskWishMessage(
  message: unknown
): message is LoggableTaskWishMessage {
  if (message === null || typeof message !== "object") return false;

  const messageType = (message as { message?: unknown }).message;

  return (
    messageType === "TW::Signal" ||
    messageType === "TW::Trace" ||
    messageType === "TW::StateChange"
  );
}
