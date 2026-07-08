import { RawStreamTag, TW } from "@taskwish/core";
import {
  flattenRouteInput,
  parseActionInput,
  routeInputFromRequest,
} from "./request";
import { responseFrom, streamChunk } from "./response";
import type { Action, NodeRegistry, RouteMeta } from "./types";

function inputFromSignal(signal: TW.Signal<string, any>): unknown {
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
    if (item.value instanceof TW.Signal) dispatchSignal(item.value, registry);
    item = await stream.next();
  }
  return item.value;
}

function rawActionStream(
  action: Action,
  args: unknown[],
): AsyncGenerator<unknown, unknown, unknown> | null {
  const raw =
    (action as unknown as {
      [RawStreamTag]?: (...args: unknown[]) => AsyncGenerator<unknown, unknown>;
    })[RawStreamTag] ?? action.stream;

  return raw ? raw(...args) : null;
}

function isStreamEvent(value: unknown): value is TW.Stream<unknown> {
  return value instanceof TW.Stream;
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

          if (item.value instanceof TW.Signal) {
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

async function invokeAction(
  action: Action,
  args: unknown[],
  registry: NodeRegistry,
): Promise<Response> {
  const stream = rawActionStream(action, args);
  if (!stream) return responseFrom(await action(...args));

  let item = await stream.next();
  while (!item.done) {
    if (item.value instanceof TW.Signal) {
      dispatchSignal(item.value, registry);
    } else if (isStreamEvent(item.value)) {
      return responseFromActionStream(stream, item.value, registry);
    }
    item = await stream.next();
  }

  return responseFrom(item.value);
}

function dispatchSignal(
  signal: TW.Signal<string, any>,
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
  return invokeAction(action, args, registry);
}

export async function invokeRouteAction(
  action: Action,
  request: Request,
  registry: NodeRegistry,
  route: RouteMeta,
): Promise<Response> {
  const [, routePath] = route;
  const rawInput = await routeInputFromRequest(routePath, request);
  return invokeAction(action, [flattenRouteInput(rawInput)], registry);
}
