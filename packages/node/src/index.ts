import { TW } from "@taskwish/core";

export type ServiceModule = Record<string, unknown>;
export type ServiceReference = ServiceModule | Promise<ServiceModule>;
type Action = ((...args: unknown[]) => unknown) & {
  stream?: (...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>;
  [TW.Name]?: string;
  [TW.Meta]?: unknown;
};

export interface NodeConfig {
  workspace?: readonly ServiceReference[];
  apps?: readonly unknown[];
  apiKey?: string;
  port?: number;
  hostname?: string;
  prefix?: string;
  development?: boolean;
}

export interface NodeRegistry {
  actions: Map<string, Action>;
  eventHandlers: Map<string, Action[]>;
}

export type NodeRoutes = Record<
  string,
  {
    GET?: (request: Request) => Response | Promise<Response>;
    POST?: (request: Request) => Response | Promise<Response>;
  }
>;

export type TaskwishNode = Bun.Server<any> & {
  name: string;
  apiKey: string;
  routes: NodeRoutes;
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
  return `${prefix}/${actionName.replace("::", "/").replace(/_/g, "-")}`;
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

async function invoke(
  action: Action,
  request: Request,
  registry: NodeRegistry,
): Promise<Response> {
  const args = await parseInput(request);
  return responseFrom(await consumeAction(action, args, registry));
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
  registry: NodeRegistry | Promise<NodeRegistry>,
  options: { prefix?: string; apiKey: string },
): Promise<NodeRoutes> {
  const routePrefix = normalizePrefix(options.prefix ?? "/tw");
  const services = await registry;
  const routes: NodeRoutes = {};

  for (const [actionName, action] of services.actions) {
    const invokeRoute = async (request: Request) => {
      try {
        return await invoke(action, request, services);
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
  registry: Promise<NodeRegistry>,
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

export async function Node(
  name: string,
  config: NodeConfig = {},
): Promise<TaskwishNode> {
  const apiKey = config.apiKey ?? generateApiKey();
  const registry = createNodeRegistry(config.workspace);
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

  return Object.assign(server, { name, apiKey, routes }) as TaskwishNode;
}
