import { EventEmitter } from "node:events";
import { randomBytes } from "node:crypto";

import { formatEvent } from "./format";
import type { LogFn } from "./logger";

export const wire = new EventEmitter();

export type WireLogConfig = "console" | LogFn;

export type WireConfig = {
  threadId?: string;
  log?: WireLogConfig;
};

export type WireGlobalConfig = WireConfig;

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ULID_TIME_LENGTH = 10;
const ULID_RANDOM_LENGTH = 16;

let globalThreadId: string | undefined = undefined;
let globalLog: WireLogConfig | undefined = undefined;

export function configureWire(config: WireGlobalConfig): WireGlobalConfig {
  for (const key in config) {
    if (key === "threadId") {
      globalThreadId = config[key];
    } else if (key === "log") {
      globalLog = config[key];
    }
  }

  return getWireConfig();
}

export function getWireConfig(): WireGlobalConfig {
  return { threadId: globalThreadId, log: globalLog };
}

export function ulid(now = Date.now()): string {
  return encodeTime(now, ULID_TIME_LENGTH) + encodeRandom(ULID_RANDOM_LENGTH);
}

export class Wire {
  declare readonly threadId: string;
  declare readonly log: WireLogConfig | undefined;

  constructor(config?: WireConfig) {
    let threadId = globalThreadId;
    let log = globalLog;

    if (config !== undefined) {
      for (const key in config) {
        if (key === "threadId") {
          threadId = config[key];
        } else if (key === "log") {
          log = config[key];
        }
      }
    }

    this.threadId = threadId ?? ulid();
    this.log = log;
  }

  trace(type: string, data: Record<string, unknown>): Record<string, unknown> {
    const loggedEvent: Record<string, unknown> = { ">>": type };

    for (const key in data) {
      loggedEvent[key] = data[key];
    }

    loggedEvent.threadId = this.threadId;

    if (this.log === undefined) {
      return loggedEvent;
    } else if (this.log === "console") {
      console.log(formatEvent(loggedEvent));
    } else {
      this.log(loggedEvent);
    }

    return loggedEvent;
  }
}

function encodeTime(now: number, length: number): string {
  if (!Number.isFinite(now) || now < 0) {
    throw new Error("Cannot generate a ULID from an invalid timestamp.");
  }

  let time = Math.floor(now);
  let value = "";

  for (let i = 0; i < length; i++) {
    const mod = time % 32;
    value = ENCODING.charAt(mod) + value;
    time = (time - mod) / 32;
  }

  return value;
}

function encodeRandom(length: number): string {
  const bytes = randomBytes(length);
  let value = "";

  for (let i = 0; i < length; i++) {
    value += ENCODING.charAt(bytes[i]! & 31);
  }

  return value;
}
