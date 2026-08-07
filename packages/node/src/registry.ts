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
    for (const eventName of candidateEventNames(actionName)) {
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

  const listeners = (value as Record<string | symbol, unknown>)[TW.Listeners];
  if (Array.isArray(listeners)) {
    for (const listener of listeners) collectExports(listener, actions, seen);
  }

  for (const exported of Object.values(value)) {
    if (isRecord(exported)) collectExports(exported, actions, seen);
  }
}

export async function createNodeRegistry(
  services: readonly ServiceReference[] = [],
): Promise<NodeRegistry> {
  const actions = new Map<string, Action>();
  const seen = new WeakSet<object>();

  for (const service of services) {
    collectExports(await service, actions, seen);
  }

  return { actions, eventHandlers: buildEventHandlers(actions) };
}
