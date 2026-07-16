import { TW } from "@taskwish/core";
import { createCommandCenterRoutes } from "./command-center";
import { invoke, invokeRouteAction } from "./invoke";
import { matchPathParams } from "./request";
import { errorResponse, json } from "./response";
import type {
  Action,
  HttpMethod,
  NodeRegistry,
  NodeRouteMap,
  NodeRouteHandler,
  NodeRoutes,
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

function normalizePrefix(prefix: string): string {
  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

function routePathForAction(prefix: string, actionName: string): string {
  return `${prefix}/${actionName.replace("::", "/").replace(/_/g, "-")}`;
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

function routeForPath(routes: NodeRoutes, pathname: string): NodeRoutes[string] | null {
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

  return null;
}

function isRouteMap(route: NodeRoutes[string]): route is NodeRouteMap {
  return !(route instanceof Response) && !("index" in route);
}

export async function createRoutes(
  registry: NodeRegistry | Promise<NodeRegistry>,
  options: { prefix?: string; apiKey: string; nodeName?: string },
): Promise<NodeRoutes> {
  const routePrefix = normalizePrefix(options.prefix ?? "/tw");
  const services = await registry;
  const routes: NodeRoutes = createCommandCenterRoutes(services, {
    nodeName: options.nodeName ?? "Taskwish",
    apiKey: options.apiKey,
    prefix: routePrefix,
  });

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
        [method]: withAuth(options.apiKey, invokeHttpRoute),
      };
    }
  }

  return routes;
}

export function createFetchHandler(
  registry: Promise<NodeRegistry>,
  options: { prefix?: string; apiKey?: string; nodeName?: string } = {},
): (request: Request) => Promise<Response> {
  const apiKey = options.apiKey ?? generateApiKey();
  const routes = createRoutes(registry, {
    prefix: options.prefix,
    apiKey,
    nodeName: options.nodeName,
  });
  const routePrefix = normalizePrefix(options.prefix ?? "/tw");

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
