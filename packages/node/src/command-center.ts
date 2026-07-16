import { TW } from "@taskwish/core";
import type {
  CommandCenterAction,
  CommandCenterConfig,
  CommandCenterInputField,
} from "@taskwish/command-center/types";
import commandCenterIndex from "@taskwish/command-center/index.html";
import { json } from "./response";
import type { Action, NodeRegistry, NodeRouteHandler, NodeRoutes } from "./types";
import { isRecord } from "./utils";

const HTTP_ROUTE_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH"]);

function routePathForAction(prefix: string, actionName: string): string {
  return `${prefix}/${actionName.replace("::", "/").replace(/_/g, "-")}`;
}

function actorColor(actor: string): string {
  const colors = [
    "#0f766e",
    "#2563eb",
    "#7c3aed",
    "#be123c",
    "#c2410c",
    "#4d7c0f",
    "#0e7490",
    "#a16207",
  ];
  let hash = 0;
  for (let index = 0; index < actor.length; index += 1) {
    hash = (hash * 31 + actor.charCodeAt(index)) >>> 0;
  }
  return colors[hash % colors.length]!;
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function actionParts(actionName: string): {
  actor: string;
  action: string;
  label: string;
} {
  const [actor = "Taskwish", action = actionName] = actionName.split("::");
  return {
    actor,
    action,
    label: humanize(action) || action,
  };
}

function metaForAction(action: Action): Record<string, unknown> {
  const meta = action[TW.Meta];
  return isRecord(meta) ? meta : {};
}

function fieldFromMeta(
  name: string,
  meta: unknown,
): CommandCenterInputField {
  if (typeof meta === "string") return { name, description: meta };
  if (!isRecord(meta)) return { name };

  return {
    name,
    description:
      typeof meta.description === "string" ? meta.description : undefined,
    example: "example" in meta ? meta.example : undefined,
  };
}

function inputFieldsFromActionMeta(
  meta: Record<string, unknown>,
): CommandCenterInputField[] {
  const input = meta.input;
  if (!isRecord(input)) return [];

  return Object.entries(input).map(([name, field]) => fieldFromMeta(name, field));
}

function inputFieldsFromRouteMeta(
  meta: Record<string, unknown>,
): CommandCenterInputField[] {
  const route = meta.route;
  if (!Array.isArray(route)) return [];

  const schema = route[2];
  if (!isRecord(schema)) return [];

  const fields: CommandCenterInputField[] = [];
  for (const section of ["params", "query", "body"] as const) {
    const value = schema[section];
    if (isRecord(value)) {
      for (const [name, fieldMeta] of Object.entries(value)) {
        fields.push(fieldFromMeta(name, fieldMeta));
      }
    }
  }
  return fields;
}

function sourceForMeta(
  meta: Record<string, unknown>,
): CommandCenterAction["source"] {
  if (typeof meta.event === "string") return "event";
  if (typeof meta.trait === "string") return "trait";
  const route = meta.route;
  if (
    Array.isArray(route) &&
    typeof route[0] === "string" &&
    HTTP_ROUTE_METHODS.has(route[0])
  ) {
    return "http";
  }
  return "local";
}

function describeAction(
  actionName: string,
  action: Action,
  routePrefix: string,
): CommandCenterAction {
  const { actor, action: method, label } = actionParts(actionName);
  const meta = metaForAction(action);
  const input = [
    ...inputFieldsFromActionMeta(meta),
    ...inputFieldsFromRouteMeta(meta),
  ];

  return {
    id: actionName,
    actor,
    action: method,
    label,
    description:
      typeof meta.description === "string" ? meta.description : undefined,
    color: actorColor(actor),
    route: routePathForAction(routePrefix, actionName),
    source: sourceForMeta(meta),
    input,
    meta,
  };
}

export function commandCenterConfig(
  registry: NodeRegistry,
  options: { nodeName: string; apiKey: string; prefix: string },
): CommandCenterConfig {
  return {
    nodeName: options.nodeName,
    apiKey: options.apiKey,
    apiPrefix: options.prefix,
    actions: Array.from(registry.actions)
      .map(([actionName, action]) =>
        describeAction(actionName, action, options.prefix),
      )
      .sort((left, right) =>
        `${left.actor} ${left.label}`.localeCompare(`${right.actor} ${right.label}`),
      ),
  };
}

export function createCommandCenterRoutes(
  registry: NodeRegistry,
  options: { nodeName: string; apiKey: string; prefix: string },
): NodeRoutes {
  const config: NodeRouteHandler = () =>
    json(200, commandCenterConfig(registry, options));

  return {
    "/": commandCenterIndex,
    "/*": commandCenterIndex,
    [`${options.prefix}/command-center/config`]: {
      GET: config,
    },
  };
}
