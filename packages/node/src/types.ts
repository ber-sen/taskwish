import { TW } from "@taskwish/core";

export type ServiceModule = Record<string, unknown>;
export type ServiceReference = ServiceModule | Promise<ServiceModule>;

export type Action = ((...args: unknown[]) => unknown) & {
  stream?: (...args: unknown[]) => AsyncGenerator<unknown, unknown, unknown>;
  [TW.Name]?: string;
  [TW.Meta]?: unknown;
};

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
