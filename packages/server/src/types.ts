import { TW } from "@taskwish/core";

export type ServiceModule = Record<string, unknown>;
export type ServiceReference = ServiceModule | Promise<ServiceModule>;

export type Action = ((...args: unknown[]) => unknown) & {
  stream?: (...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>;
  [TW.Name]?: string;
  [TW.Meta]?: unknown;
  [TW.InputSchema]?: unknown;
};

export type McpToolSelector = string | Action;

export interface McpEndpointConfig {
  /** URL that serves this MCP tool collection. Defaults to `/actor`. */
  path?: string;
  /** Actions to expose. Omit this to expose every registered action. */
  tools?: readonly McpToolSelector[];
}

export type McpConfig =
  | boolean
  | string
  | McpEndpointConfig
  | readonly McpEndpointConfig[];

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type RouteMeta = readonly [
  method: HttpMethod,
  path: string,
  schema: Record<string, unknown>,
];

export interface NodeAppContext {
  registry: NodeRegistry;
  nodeName: string;
  apiKey: string;
  prefix: string;
}

export interface NodeAppReadyContext extends NodeAppContext {
  server: Bun.Server<any>;
}

export interface NodeApp {
  name?: string;
  routes?: (context: NodeAppContext) => NodeRoutes | Promise<NodeRoutes>;
  ready?: (context: NodeAppReadyContext) => void | Promise<void>;
}

export interface NodeConfig {
  workspace?: readonly ServiceReference[];
  apps?: readonly NodeApp[];
  /** MCP endpoints. Enabled at `/actor` by default; set to `false` to disable. */
  mcp?: McpConfig;
  apiKey?: string;
  port?: number;
  hostname?: string;
  prefix?: string;
  development?: boolean;
}

export interface NodeRegistry {
  actions: Map<string, Action>;
  eventHandlers: Map<string, Action[]>;
  states?: Map<string, Record<string, unknown>>;
}

export type NodeRouteHandler = (
  request: Request,
) => Response | Promise<Response>;

export type NodeRouteMap = Partial<Record<HttpMethod, NodeRouteHandler>>;

export type NodeStaticRoute = Response | Bun.HTMLBundle;

export type NodeRoutes = Record<string, NodeRouteMap | NodeStaticRoute>;

export type TaskWishNode = Bun.Server<any> & {
  name: string;
  apiKey: string;
  routes: NodeRoutes;
};
