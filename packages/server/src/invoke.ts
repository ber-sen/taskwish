import {
  RawLoggedStreamTag,
  RawStreamTag,
  TW,
  statePayload,
} from "@taskwish/core";
import { Signal, Trace } from "@taskwish/wire";
import {
  flattenRouteInput,
  parseActionInput,
  routeInputFromRequest,
} from "./request";
import { responseFrom, streamChunk } from "./response";
import type { Action, NodeRegistry, RouteMeta } from "./types";

type InvokeOptions = {
  includeWire: boolean;
  responseMode: "default" | "sse";
};

function inputFromSignal(signal: Signal<string, any>): unknown {
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(signal.data)) {
    if (key !== "->") input[key] = value;
  }
  return input;
}

async function consumeAction(
  action: Action,
  args: unknown[],
  registry: NodeRegistry,
): Promise<unknown> {
  if (!action.stream) return action(...args);

  const stream = action.stream(...args);
  let item = await stream.next();
  while (!item.done) {
    if (item.value instanceof Signal) dispatchSignal(item.value, registry);
    item = await stream.next();
  }
  return item.value;
}

function rawActionStream(
  action: Action,
  args: unknown[],
): AsyncGenerator<unknown, unknown, unknown> | null {
  const raw =
    (
      action as unknown as {
        [RawLoggedStreamTag]?: (
          ...args: unknown[]
        ) => AsyncGenerator<unknown, unknown>;
      }
    )[RawLoggedStreamTag] ??
    (
      action as unknown as {
        [RawStreamTag]?: (
          ...args: unknown[]
        ) => AsyncGenerator<unknown, unknown>;
      }
    )[RawStreamTag] ??
    action.stream;

  return raw ? raw(...args) : null;
}

function isStreamEvent(value: unknown): value is TW.Stream<unknown> {
  return value instanceof TW.Stream;
}

function acceptsServerSentEvents(request: Request): boolean {
  return (
    request.headers
      .get("Accept")
      ?.split(",")
      .some((value) =>
        value.trim().toLowerCase().startsWith("text/event-stream"),
      ) ?? false
  );
}

function includesWireEvents(request: Request): boolean {
  const value = request.headers.get("wire");
  if (value === null) return false;

  const normalized = value.trim().toLowerCase();
  return (
    normalized === "" || !["0", "false", "off", "none"].includes(normalized)
  );
}

function invokeOptionsFromRequest(request: Request): InvokeOptions {
  return {
    includeWire: includesWireEvents(request),
    responseMode: acceptsServerSentEvents(request) ? "sse" : "default",
  };
}

function ssePayload(event: string, data: unknown): Uint8Array {
  const raw = JSON.stringify(data, serializeSseValue) ?? String(data);
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const message =
    [`event: ${event}`, ...lines.map((line) => `data: ${line}`), ""].join(
      "\n",
    ) + "\n";
  return new TextEncoder().encode(message);
}

function serializeSseValue(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { message: value.message };
  }

  return value;
}

function responseFromActionStream(
  stream: AsyncGenerator<unknown, unknown, unknown>,
  firstChunk: TW.Stream<unknown>,
  registry: NodeRegistry,
): Response {
  let pending: TW.Stream<unknown> | null = firstChunk;

  return new Response(
    new ReadableStream({
      async pull(controller) {
        while (true) {
          if (pending) {
            const chunk = pending;
            pending = null;
            controller.enqueue(await streamChunk(chunk.data));
            return;
          }

          const item = await stream.next();
          if (item.done) {
            controller.close();
            return;
          }

          if (item.value instanceof Signal) {
            dispatchSignal(item.value, registry);
          } else if (isStreamEvent(item.value)) {
            controller.enqueue(await streamChunk(item.value.data));
            return;
          }
        }
      },
      async cancel() {
        await stream.return?.(undefined);
      },
    }),
  );
}

function responseFromActionSseStream(
  stream: AsyncGenerator<unknown, unknown, unknown>,
  registry: NodeRegistry,
  options: InvokeOptions,
): Response {
  return new Response(
    new ReadableStream({
      async pull(controller) {
        try {
          while (true) {
            const item = await stream.next();
            if (item.done) {
              if (item.value !== undefined) {
                const state = statePayload(item.value);
                controller.enqueue(
                  state
                    ? ssePayload("state", state)
                    : ssePayload("result", item.value),
                );
              }
              controller.close();
              return;
            }

            if (item.value instanceof TW.StateChange) {
              controller.enqueue(ssePayload("state-change", item.value.data));
              return;
            } else if (item.value instanceof Signal) {
              dispatchSignal(item.value, registry);
              if (options.includeWire) {
                controller.enqueue(ssePayload("wire", item.value.data));
                return;
              }
            } else if (item.value instanceof Trace) {
              if (options.includeWire) {
                controller.enqueue(ssePayload("wire", item.value.data));
                return;
              }
            } else if (isStreamEvent(item.value)) {
              controller.enqueue(ssePayload("yield", item.value.data));
              return;
            } else {
              controller.enqueue(ssePayload("yield", item.value));
              return;
            }
          }
        } catch (error) {
          controller.enqueue(
            ssePayload("error", {
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          controller.close();
        }
      },
      async cancel() {
        await stream.return?.(undefined);
      },
    }),
    {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream; charset=utf-8",
      },
    },
  );
}

async function invokeAction(
  action: Action,
  args: unknown[],
  registry: NodeRegistry,
  options: InvokeOptions,
): Promise<Response> {
  const stream = rawActionStream(action, args);
  if (!stream) return responseFrom(await action(...args));

  if (options.responseMode === "sse") {
    return responseFromActionSseStream(stream, registry, options);
  }

  let item = await stream.next();
  while (!item.done) {
    if (item.value instanceof Signal) {
      dispatchSignal(item.value, registry);
    } else if (isStreamEvent(item.value)) {
      return responseFromActionStream(stream, item.value, registry);
    }
    item = await stream.next();
  }

  return responseFrom(item.value);
}

function dispatchSignal(
  signal: Signal<string, any>,
  registry: NodeRegistry,
): void {
  const handlers = registry.eventHandlers.get(signal.data["->"]) ?? [];
  const input = inputFromSignal(signal);
  for (const handler of handlers) {
    void consumeAction(handler, [input], registry).catch((error) => {
      console.error(error);
    });
  }
}

export async function invoke(
  action: Action,
  request: Request,
  registry: NodeRegistry,
): Promise<Response> {
  const args = await parseActionInput(request);
  return invokeAction(
    action,
    args,
    registry,
    invokeOptionsFromRequest(request),
  );
}

export async function invokeRouteAction(
  action: Action,
  request: Request,
  registry: NodeRegistry,
  route: RouteMeta,
): Promise<Response> {
  const [, routePath] = route;
  const rawInput = await routeInputFromRequest(routePath, request);
  return invokeAction(
    action,
    [flattenRouteInput(rawInput)],
    registry,
    invokeOptionsFromRequest(request),
  );
}
