import { TW } from "@taskwish/core";
import type { Action, NodeRegistry, ServiceReference } from "./types";
import { isRecord } from "./utils";

function isAction(value: unknown): value is Action {
  return (
    typeof value === "function" &&
    typeof (value as unknown as Record<string | symbol, unknown>)[TW.Name] ===
      "string"
  );
}

function toPascalCaseName(name: string): string {
  return name
    .split(/[_-\s.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function candidateEventNames(actionName: string): string[] {
  const [, methodName] = actionName.split("::");
  if (!methodName?.startsWith("on_")) return [];

  const parts = methodName.slice(3).split("_").filter(Boolean);
  const eventNames: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    eventNames.push(
      `${toPascalCaseName(parts.slice(0, i).join("_"))}::${toPascalCaseName(
        parts.slice(i).join("_"),
      )}`,
    );
  }
  return eventNames;
}

function buildEventHandlers(actions: Map<string, Action>): Map<string, Action[]> {
  const eventHandlers = new Map<string, Action[]>();
  for (const [actionName, action] of actions) {
    const meta = action[TW.Meta];
    const eventMeta =
      meta !== null && typeof meta === "object"
        ? (meta as Record<string, unknown>).event
        : null;
    const eventNames =
      typeof eventMeta === "string"
        ? [eventMeta]
        : candidateEventNames(actionName);

    for (const eventName of eventNames) {
      const handlers = eventHandlers.get(eventName) ?? [];
      handlers.push(action);
      eventHandlers.set(eventName, handlers);
    }
  }
  return eventHandlers;
}

function collectExports(
  value: unknown,
  actions: Map<string, Action>,
  states: Map<string, Record<string, unknown>>,
  seen: WeakSet<object>,
): void {
  if (!isRecord(value)) return;
  if (seen.has(value)) return;
  seen.add(value);

  if (isAction(value)) {
    const actionName = (value as Action)[TW.Name];
    if (typeof actionName === "string") actions.set(actionName, value);
    return;
  }

  const actorName = value[TW.Name];
  const actorStates = value[TW.States];
  if (
    typeof actorName === "string" &&
    isRecord(actorStates) &&
    Object.keys(actorStates).length > 0
  ) {
    states.set(actorName, actorStates as Record<string, unknown>);
  }

  const listeners = (value as Record<string | symbol, unknown>)[TW.Listeners];
  if (Array.isArray(listeners)) {
    for (const listener of listeners) {
      collectExports(listener, actions, states, seen);
    }
  }

  for (const exported of Object.values(value)) {
    if (isRecord(exported)) collectExports(exported, actions, states, seen);
  }
}

export async function createNodeRegistry(
  services: readonly ServiceReference[] = [],
): Promise<NodeRegistry> {
  const actions = new Map<string, Action>();
  const states = new Map<string, Record<string, unknown>>();
  const seen = new WeakSet<object>();

  for (const service of services) {
    collectExports(await service, actions, states, seen);
  }

  return { actions, eventHandlers: buildEventHandlers(actions), states };
}
