import { EventEmitter } from "node:events";

import { formatEvent } from "./format";
import type { LogFn } from "./logger";

export const wire = new EventEmitter();

export type WireConfig = {
  threadId: string;
  log: "console" | LogFn;
};

export class Wire {
  declare readonly threadId: string;
  declare readonly log: "console" | LogFn;

  constructor(config: WireConfig) {
    this.threadId = config.threadId;
    this.log = config.log;
  }

  trace(type: string, data: Record<string, unknown>): Record<string, unknown> {
    const loggedEvent: Record<string, unknown> = { ">>": type };

    for (const key in data) {
      loggedEvent[key] = data[key];
    }

    loggedEvent.threadId = this.threadId;

    if (this.log === "console") {
      console.log(formatEvent(loggedEvent));
    } else {
      this.log(loggedEvent);
    }

    return loggedEvent;
  }
}
