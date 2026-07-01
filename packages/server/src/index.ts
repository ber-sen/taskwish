import { TW } from "@taskwish/core";

export type ServiceModule = Record<string, unknown>;
export type ServiceReference = ServiceModule | Promise<ServiceModule>;
type Action = ((...args: unknown[]) => unknown) & {
  stream?: (...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>;
  [TW.Name]?: string;
  [TW.Meta]?: unknown;
};

export interface ServerConfig {
  services?: readonly ServiceReference[];
  apps?: readonly unknown[];
  apiKey?: string;
  port?: number;
  hostname?: string;
  prefix?: string;
  development?: boolean;
}

export interface ServiceRegistry {
  actions: Map<string, Action>;
}

export type ServerRoutes = Record<
  string,
  {
    GET?: (request: Request) => Response | Promise<Response>;
    POST?: (request: Request) => Response | Promise<Response>;
  }
>;

export type TaskwishServer = Bun.Server<any> & {
  apiKey: string;
  routes: ServerRoutes;
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function normalizePrefix(prefix: string): string {
  const normalized = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

function routePathForAction(prefix: string, actionName: string): string {
  return `${prefix}/${actionName}`;
}

function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function isRecord(value: unknown): value is Record<string | symbol, unknown> {
  return (
    value !== null && (typeof value === "object" || typeof value === "function")
  );
}

function isAction(value: unknown): value is Action {
  return (
    typeof value === "function" &&
    typeof (value as unknown as Record<string | symbol, unknown>)[TW.Name] ===
      "string"
  );
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
    actions.set(value[TW.Name]!, value);
    return;
  }

  for (const exported of Object.values(value)) {
    if (isRecord(exported)) collectExports(exported, actions, seen);
  }
}

export async function createServiceRegistry(
  services: readonly ServiceReference[] = [],
): Promise<ServiceRegistry> {
  const actions = new Map<string, Action>();
  const seen = new WeakSet<object>();

  for (const service of services) {
    collectExports(await service, actions, seen);
  }

  return { actions };
}

async function parseInput(request: Request): Promise<unknown[]> {
  if (request.method === "GET" || request.method === "HEAD") {
    const params = Object.fromEntries(
      new URL(request.url).searchParams.entries(),
    );
    return Object.keys(params).length > 0 ? [params] : [];
  }

  const contentType = request.headers.get("Content-Type") ?? "";
  const contentLength = request.headers.get("Content-Length");
  if (contentLength === "0") return [];

  if (contentType.includes("application/json")) {
    const text = await request.text();
    if (text.length === 0) return [];
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : [value];
  }

  const text = await request.text();
  return text.length > 0 ? [text] : [];
}

function responseFrom(result: unknown): Response {
  if (result instanceof Response) return result;
  if (result === undefined) return new Response(null, { status: 204 });
  if (typeof result === "string") {
    return new Response(result, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(JSON.stringify(result), { headers: JSON_HEADERS });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

async function invoke(action: Action, request: Request): Promise<Response> {
  const args = await parseInput(request);
  return responseFrom(await action(...args));
}

function authorized(request: Request, apiKey: string): boolean {
  const authorization = request.headers.get("Authorization");
  if (authorization === `Bearer ${apiKey}`) return true;
  return request.headers.get("x-api-key") === apiKey;
}

function withAuth(
  apiKey: string,
  handler: (request: Request) => Response | Promise<Response>,
): (request: Request) => Response | Promise<Response> {
  return (request) => {
    if (!authorized(request, apiKey)) {
      return json(401, { error: "Unauthorized" });
    }
    return handler(request);
  };
}

function errorResponse(error: unknown): Response {
  return json(
    error instanceof Error &&
      typeof (error as Error & { status?: unknown }).status === "number"
      ? (error as Error & { status: number }).status
      : 500,
    {
      error: error instanceof Error ? error.message : String(error),
    },
  );
}

export async function createRoutes(
  registry: ServiceRegistry | Promise<ServiceRegistry>,
  options: { prefix?: string; apiKey: string },
): Promise<ServerRoutes> {
  const routePrefix = normalizePrefix(options.prefix ?? "/tw");
  const services = await registry;
  const routes: ServerRoutes = {};

  for (const [actionName, action] of services.actions) {
    const invokeRoute = async (request: Request) => {
      try {
        return await invoke(action, request);
      } catch (error) {
        return errorResponse(error);
      }
    };

    routes[routePathForAction(routePrefix, actionName)] = {
      GET: withAuth(options.apiKey, invokeRoute),
      POST: withAuth(options.apiKey, invokeRoute),
    };
  }

  return routes;
}

export function createFetchHandler(
  registry: Promise<ServiceRegistry>,
  options: { prefix?: string; apiKey?: string } = {},
): (request: Request) => Promise<Response> {
  const apiKey = options.apiKey ?? generateApiKey();
  const routes = createRoutes(registry, {
    prefix: options.prefix,
    apiKey,
  });
  const routePrefix = normalizePrefix(options.prefix ?? "/tw");

  return async function fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${routePrefix}/`)) {
      return json(404, { error: "Not Found" });
    }

    const routeMap = await routes;
    const route = routeMap[decodeURIComponent(url.pathname)];
    if (!route) return json(404, { error: "Not Found" });

    if (request.method === "GET" && route.GET) return route.GET(request);
    if (request.method === "POST" && route.POST) return route.POST(request);
    return json(405, { error: "Method Not Allowed" });
  };
}

export async function Server(config: ServerConfig = {}): Promise<TaskwishServer> {
  const apiKey = config.apiKey ?? generateApiKey();
  const registry = createServiceRegistry(config.services);
  const routes = await createRoutes(registry, {
    prefix: config.prefix,
    apiKey,
  });

  const server = Bun.serve({
    port: config.port ?? 3000,
    hostname: config.hostname,
    development: config.development,
    routes,
    fetch() {
      return json(404, { error: "Not Found" });
    },
  } as Parameters<typeof Bun.serve>[0]);

  return Object.assign(server, { apiKey, routes }) as TaskwishServer;
}
