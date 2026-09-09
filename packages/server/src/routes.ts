import { TW } from "@taskwish/core";
import { invoke, invokeRouteAction } from "./invoke";
import { createMcpRoutes } from "./mcp";
import { matchPathParams } from "./request";
import { errorResponse, json } from "./response";
import type {
  Action,
  HttpMethod,
  NodeRegistry,
  NodeRouteMap,
  NodeRouteHandler,
  NodeRoutes,
  NodeApp,
  McpConfig,
  RouteMeta,
} from "./types";
import { generateApiKey, isRecord } from "./utils";

export const HTTP_METHODS = new Set<HttpMethod>([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
]);

export function normalizePrefix(prefix: string): string {
  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

function routePathForAction(prefix: string, actionName: string): string {
  const separator = actionName.indexOf("::");
  if (separator === -1) return `${prefix}/${actionName.replace(/_/g, "-")}`;

  const actor = actionName.slice(0, separator);
  const action = actionName
    .slice(separator + 2)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
  return `${prefix}/${actor}/${action}`;
}

function routeMetaForAction(action: Action): RouteMeta | null {
  const meta = action[TW.Meta];
  if (!isRecord(meta)) return null;

  const route = meta.route;
  if (!Array.isArray(route)) return null;

  const [method, path, schema] = route;
  if (typeof method !== "string" || !HTTP_METHODS.has(method as HttpMethod)) {
    return null;
  }
  if (typeof path !== "string") return null;

  return [
    method as HttpMethod,
    path,
    isRecord(schema) ? (schema as Record<string, unknown>) : {},
  ];
}

function authorized(request: Request, apiKey: string): boolean {
  const authorization = request.headers.get("Authorization");
  if (authorization === `Bearer ${apiKey}`) return true;
  return request.headers.get("x-api-key") === apiKey;
}

function withAuth(apiKey: string, handler: NodeRouteHandler): NodeRouteHandler {
  return (request) => {
    if (!authorized(request, apiKey)) {
      return json(401, { error: "Unauthorized" });
    }
    return handler(request);
  };
}

function routeForPath(
  routes: NodeRoutes,
  pathname: string,
): NodeRoutes[string] | null {
  const decodedPath = decodeURIComponent(pathname);
  const exact = routes[decodedPath];
  if (exact) return exact;

  for (const [routePath, route] of Object.entries(routes)) {
    if (
      routePath.includes(":") &&
      !(route instanceof Response) &&
      matchPathParams(routePath, decodedPath)
    ) {
      return route;
    }
  }

  const wildcard = routes["/*"];
  if (wildcard) return wildcard;

  return null;
}

function isRouteMap(route: NodeRoutes[string]): route is NodeRouteMap {
  return !(route instanceof Response) && !("index" in route);
}

export async function createRoutes(
  registry: NodeRegistry | Promise<NodeRegistry>,
  options: {
    prefix?: string;
    apiKey: string;
    nodeName?: string;
    apps?: readonly NodeApp[];
    mcp?: McpConfig;
  },
): Promise<NodeRoutes> {
  const routePrefix = normalizePrefix(options.prefix ?? "/tw");
  const nodeName = options.nodeName ?? "TaskWish";
  const services = await registry;
  const routes: NodeRoutes = {};

  Object.assign(
    routes,
    createMcpRoutes(services, {
      apiKey: options.apiKey,
      nodeName,
      mcp: options.mcp,
    }),
  );

  for (const app of options.apps ?? []) {
    Object.assign(
      routes,
      await app.routes?.({
        registry: services,
        nodeName,
        apiKey: options.apiKey,
        prefix: routePrefix,
        mcp: options.mcp,
      }),
    );
  }

  for (const [actionName, action] of services.actions) {
    const invokeActionRoute = async (request: Request) => {
      try {
        return await invoke(action, request, services);
      } catch (error) {
        return errorResponse(error);
      }
    };

    routes[routePathForAction(routePrefix, actionName)] = {
      GET: withAuth(options.apiKey, invokeActionRoute),
      POST: withAuth(options.apiKey, invokeActionRoute),
    };

    const routeMeta = routeMetaForAction(action);
    if (routeMeta) {
      const [method, routePath] = routeMeta;
      const invokeHttpRoute = async (request: Request) => {
        try {
          return await invokeRouteAction(action, request, services, routeMeta);
        } catch (error) {
          return errorResponse(error);
        }
      };

      routes[routePath] = {
        ...routes[routePath],
        [method]: invokeHttpRoute,
      };
    }
  }

  return routes;
}

export function createFetchHandler(
  registry: Promise<NodeRegistry>,
  options: {
    prefix?: string;
    apiKey?: string;
    nodeName?: string;
    apps?: readonly NodeApp[];
    mcp?: McpConfig;
  } = {},
): (request: Request) => Promise<Response> {
  const apiKey = options.apiKey ?? generateApiKey();
  const routes = createRoutes(registry, {
    prefix: options.prefix,
    apiKey,
    nodeName: options.nodeName,
    apps: options.apps,
    mcp: options.mcp,
  });
  const routePrefix = normalizePrefix(options.prefix ?? "/tw");

  return createFetchHandlerFromRoutes(routes, routePrefix);
}

export function createFetchHandlerFromRoutes(
  routes: NodeRoutes | Promise<NodeRoutes>,
  routePrefix = "/tw",
): (request: Request) => Promise<Response> {
  return async function fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const routeMap = await routes;
    const route = routeForPath(routeMap, url.pathname);

    if (!route && !url.pathname.startsWith(`${routePrefix}/`)) {
      return json(404, { error: "Not Found" });
    }

    if (!route) return json(404, { error: "Not Found" });

    if (!isRouteMap(route)) {
      if (route instanceof Response) return route;
      return json(404, { error: "Not Found" });
    }

    if (HTTP_METHODS.has(request.method as HttpMethod)) {
      const handler = route[request.method as HttpMethod];
      if (handler) return handler(request);
    }
    return json(405, { error: "Method Not Allowed" });
  };
}
