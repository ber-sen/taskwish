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

export interface NodeConfig {
  workspace?: readonly ServiceReference[];
  apps?: readonly unknown[];
  apiKey?: string;
  port?: number;
  hostname?: string;
  prefix?: string;
  development?: boolean;
  openBrowser?: boolean | "ask";
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

export type TaskwishNode = Bun.Server<any> & {
  name: string;
  apiKey: string;
  routes: NodeRoutes;
};
