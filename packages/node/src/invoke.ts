import { TW } from "@taskwish/core";
import { flattenRouteInput, parseActionInput, routeInputFromRequest } from "./request";
import { responseFrom } from "./response";
import type { Action, NodeRegistry, RouteMeta } from "./types";

function isTaskwishEvent(
  value: unknown,
): value is TW.Event<string, any> {
  return (
    value instanceof TW.Event &&
    typeof (value as unknown as Record<string, unknown>)["->"] === "string"
  );
}

function inputFromEvent(event: TW.Event<string, any>): unknown {
  if ("data" in event) return event.data;

  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
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
    if (isTaskwishEvent(item.value)) dispatchEvent(item.value, registry);
    item = await stream.next();
  }
  return item.value;
}

function dispatchEvent(
  event: TW.Event<string, any>,
  registry: NodeRegistry,
): void {
  const handlers = registry.eventHandlers.get(event["->"]) ?? [];
  const input = inputFromEvent(event);
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
  return responseFrom(await consumeAction(action, args, registry));
}

export async function invokeRouteAction(
  action: Action,
  request: Request,
  registry: NodeRegistry,
  route: RouteMeta,
): Promise<Response> {
  const [, routePath] = route;
  const rawInput = await routeInputFromRequest(routePath, request);
  return responseFrom(
    await consumeAction(action, [flattenRouteInput(rawInput)], registry),
  );
}
