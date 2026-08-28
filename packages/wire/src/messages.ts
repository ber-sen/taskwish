import type { Pretty } from "./types";

export class Message<
  const MessageType extends string = string,
  Data = unknown,
  Log = Data
> {
  public readonly log: Log;

  constructor(
    public readonly message: MessageType,
    public data: Data,
    public readonly symbol?: string
  ) {
    this.log = constructLog(data, symbol) as Log;
  }

  toSSE(): Uint8Array {
    const raw =
      JSON.stringify(this.data, serializeSseValue) ?? String(this.data);
    const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const output =
      [
        `event: ${this.message}`,
        ...lines.map((line) => `data: ${line}`),
        "",
      ].join("\n") + "\n";

    return new TextEncoder().encode(output);
  }
}

function constructLog(data: unknown, symbol?: string): unknown {
  if (symbol === undefined || data === null || typeof data !== "object") {
    return data;
  }

  const record = data as Record<string, unknown>;
  const subjectKey =
    "path" in record ? "path" : "event" in record ? "event" : null;
  if (subjectKey === null) return data;

  const { [subjectKey]: subject, ...params } = record;
  return Object.assign({ [symbol]: subject }, params);
}

function serializeSseValue(_key: string, value: unknown): unknown {
  return value instanceof Error ? { message: value.message } : value;
}

export class Signal<
  const EventType extends string = string,
  Data = Record<string, unknown>
> extends Message<
  "TW::Signal",
  { event: EventType; data: Data },
  { "->": EventType; data: Data }
> {
  constructor(public readonly event: EventType, data: Data) {
    super("TW::Signal", { event, data }, "->");
  }
}

export class Trace<
  const Path extends string = string,
  Data extends object = Record<string, unknown>
> extends Message<
  "TW::Trace",
  Pretty<{ path: Path } & Data>,
  Pretty<{ ">>": Path } & Data>
> {
  constructor(public readonly path: Path, public readonly params: Data) {
    super("TW::Trace", Object.assign({ path }, params), ">>");
  }
}

export class Stream<const Data> extends Message<"TW::Stream", Data> {
  constructor(data: Data) {
    super("TW::Stream", data);
  }
}

/** A value returned as the result of an action. */
export class Result<const Data = unknown> extends Message<"TW::Result", Data> {
  constructor(data: Data) {
    super("TW::Result", data);
  }
}

/** A structured description of an actor-state mutation. */
export class StateChange<
  const Path extends string = string,
  const Params extends object = Record<string, unknown>
> extends Message<
  "TW::StateChange",
  Pretty<{ path: Path } & Params>,
  Pretty<{ ":=": Path } & Params>
> {
  constructor(public readonly path: Path, public readonly params: Params) {
    super("TW::StateChange", Object.assign({ path }, params), ":=");
  }
}

/** A state value returned as the result of an action. */
export class StateResult<
  const Path extends string = string,
  const Params extends object = Record<string, unknown>
> extends Message<
  "TW::StateResult",
  Pretty<{ path: Path } & Params>,
  Pretty<{ "=>": Path } & Params>
> {
  constructor(public readonly path: Path, public readonly params: Params) {
    super("TW::StateResult", Object.assign({ path }, params), "=>");
  }
}

export function messageData(message: unknown): unknown {
  return isTaskWishMessage(message) ? message.data : message;
}

export function messageLogData(message: unknown): unknown {
  return message instanceof Message ? message.log : message;
}

type TaskWishMessage = Signal | Trace | Result | StateChange | StateResult;

function isTaskWishMessage(message: unknown): message is TaskWishMessage {
  if (message === null || typeof message !== "object") return false;

  const messageType = (message as { message?: unknown }).message;

  return (
    messageType === "TW::Signal" ||
    messageType === "TW::Trace" ||
    messageType === "TW::Result" ||
    messageType === "TW::StateChange" ||
    messageType === "TW::StateResult"
  );
}
