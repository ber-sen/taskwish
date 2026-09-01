import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import type {
  CallToolResult,
  McpHttpHandler,
  StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { TW } from "@taskwish/core";
import { type as arkType } from "arktype";
import { invoke } from "./invoke";
import { json } from "./response";
import type {
  Action,
  McpConfig,
  McpEndpointConfig,
  McpToolSelector,
  NodeRegistry,
  NodeRouteHandler,
  NodeRoutes,
} from "./types";
import { isRecord } from "./utils";

const DEFAULT_MCP_PATH = "/actor";

type PreparedInput = {
  schema?: StandardSchemaWithJSON;
  payload: (input: unknown) => unknown;
};

function normalizePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
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

function endpointConfigs(config: McpConfig | undefined): McpEndpointConfig[] {
  if (config === false) return [];
  if (config === undefined || config === true) return [{ path: DEFAULT_MCP_PATH }];
  if (typeof config === "string") return [{ path: config }];
  return Array.isArray(config) ? [...config] : [config as McpEndpointConfig];
}

function actionSelected(
  actionName: string,
  action: Action,
  selectors: readonly McpToolSelector[] | undefined,
): boolean {
  if (selectors === undefined) return true;

  return selectors.some((selector) => {
    if (typeof selector !== "string") return selector === action;
    if (selector === actionName) return true;
    if (selector.endsWith("::*")) {
      return actionName.startsWith(`${selector.slice(0, -3)}::`);
    }
    return !selector.includes("::") && actionName.startsWith(`${selector}::`);
  });
}

function toolNameForAction(actionName: string): string {
  return actionName
    .replace(/::/g, ".")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(0, 128);
}

function actionMeta(action: Action): Record<string, unknown> {
  return isRecord(action[TW.Meta]) ? action[TW.Meta] : {};
}

function actionDescription(actionName: string, action: Action): string {
  const meta = actionMeta(action);
  if (typeof meta.description === "string") return meta.description;

  const route = meta.route;
  if (Array.isArray(route) && isRecord(route[2])) {
    const description = route[2].description;
    if (typeof description === "string") return description;
  }

  return `Invoke ${actionName}`;
}

function flatRouteSchema(meta: Record<string, unknown>): unknown {
  const route = meta.route;
  if (!Array.isArray(route) || !isRecord(route[2])) return undefined;

  const flat: Record<string, unknown> = {};
  for (const section of ["params", "query", "body"] as const) {
    const fields = route[2][section];
    if (isRecord(fields)) Object.assign(flat, fields);
  }
  return Object.keys(flat).length > 0 ? flat : undefined;
}

function compileSchema(schema: unknown): StandardSchemaWithJSON | undefined {
  if (schema === undefined) return undefined;
  try {
    return arkType.raw(schema as never) as unknown as StandardSchemaWithJSON;
  } catch {
    return undefined;
  }
}

function preparedInput(action: Action): PreparedInput {
  const routeSchema = flatRouteSchema(actionMeta(action));
  const schema = routeSchema ?? action[TW.InputSchema];
  if (schema === undefined) return { payload: () => undefined };

  const compiled = compileSchema(schema);
  if (!compiled) return { payload: (input) => input };

  let jsonSchema: Record<string, unknown>;
  try {
    jsonSchema = compiled["~standard"].jsonSchema.input({
      target: "draft-2020-12",
    });
  } catch {
    return { payload: (input) => input };
  }

  if (jsonSchema.type === "object") {
    return { schema: compiled, payload: (input) => input };
  }

  if (Array.isArray(schema) && !schema.includes("|")) {
    return {
      schema: compileSchema({ args: schema }),
      payload: (input) => (isRecord(input) ? input.args : input),
    };
  }

  return {
    schema: compileSchema({ input: schema }),
    payload: (input) => (isRecord(input) ? input.input : input),
  };
}

async function actionResponse(
  action: Action,
  registry: NodeRegistry,
  payload: unknown,
): Promise<Response> {
  const hasPayload = payload !== undefined;
  return invoke(
    action,
    new Request("http://taskwish.local/actor", {
      method: "POST",
      headers: hasPayload ? { "Content-Type": "application/json" } : undefined,
      body: hasPayload ? JSON.stringify(payload) : undefined,
    }),
    registry,
  );
}

async function toolResultFromResponse(response: Response): Promise<CallToolResult> {
  const contentType = response.headers.get("Content-Type") ?? "";
  const isError = !response.ok;

  if (response.status === 204) {
    return { content: [], ...(isError ? { isError: true } : {}) };
  }

  if (contentType.includes("application/json")) {
    const value = await response.json();
    const text = JSON.stringify(value);
    return {
      content: [{ type: "text", text }],
      ...(isRecord(value) ? { structuredContent: value } : {}),
      ...(isError ? { isError: true } : {}),
    };
  }

  if (contentType.startsWith("image/")) {
    const data = Buffer.from(await response.arrayBuffer()).toString("base64");
    return {
      content: [{ type: "image", data, mimeType: contentType.split(";")[0] }],
      ...(isError ? { isError: true } : {}),
    };
  }

  return {
    content: [{ type: "text", text: await response.text() }],
    ...(isError ? { isError: true } : {}),
  };
}

function createEndpointHandler(
  registry: NodeRegistry,
  nodeName: string,
  tools: readonly [string, Action][],
): McpHttpHandler {
  return createMcpHandler(() => {
    const server = new McpServer({ name: nodeName, version: "0.0.1" });
    const usedNames = new Set<string>();

    for (const [actionName, action] of tools) {
      const toolName = toolNameForAction(actionName);
      if (usedNames.has(toolName)) {
        throw new Error(
          `Actions exposed through MCP resolve to the same tool name: ${toolName}`,
        );
      }
      usedNames.add(toolName);

      const input = preparedInput(action);
      server.registerTool(
        toolName,
        {
          description: actionDescription(actionName, action),
          ...(input.schema ? { inputSchema: input.schema } : {}),
          _meta: { "taskwish/action": actionName },
        },
        async (args) => {
          try {
            const response = await actionResponse(
              action,
              registry,
              input.payload(args),
            );
            return await toolResultFromResponse(response);
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: error instanceof Error ? error.message : String(error),
                },
              ],
              isError: true,
            };
          }
        },
      );
    }

    return server;
  });
}

export function createMcpRoutes(
  registry: NodeRegistry,
  options: { apiKey: string; nodeName: string; mcp?: McpConfig },
): NodeRoutes {
  const routes: NodeRoutes = {};

  for (const endpoint of endpointConfigs(options.mcp)) {
    const path = normalizePath(endpoint.path ?? DEFAULT_MCP_PATH);
    const tools = Array.from(registry.actions).filter(([actionName, action]) =>
      actionSelected(actionName, action, endpoint.tools),
    );
    const handler = createEndpointHandler(registry, options.nodeName, tools);
    const fetch = withAuth(options.apiKey, (request) => handler.fetch(request));

    routes[path] = {
      GET: fetch,
      POST: fetch,
      DELETE: fetch,
    };
  }

  return routes;
}
