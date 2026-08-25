import { createInterface } from "node:readline/promises";
import { type as arkType } from "arktype";
import consoleIndex from "@taskwish/console/index.html";
import type {
  ConsoleAction,
  ConsoleConfig,
  ConsoleJsonSchema,
  ConsoleInputField,
} from "./types";

const TW_META = Symbol.for("TW.Meta");
const TW_INPUT_SCHEMA = Symbol.for("TW.InputSchema");
const HTTP_ROUTE_METHODS = new Set(["GET", "POST", "PUT", "DELETE", "PATCH"]);
const PRIMITIVE_ARK_SCHEMAS = new Set([
  "string",
  "number",
  "boolean",
  "bigint",
  "symbol",
  "object",
  "unknown",
]);

type Action = (...args: unknown[]) => unknown;
type NodeRegistry = {
  actions: Map<string, Action>;
};
type NodeRouteHandler = (request: Request) => Response | Promise<Response>;
type NodeRoutes = Record<
  string,
  Partial<Record<string, NodeRouteHandler>> | Response | Bun.HTMLBundle
>;
type NodeAppContext = {
  registry: NodeRegistry;
  nodeName: string;
  apiKey: string;
  prefix: string;
};
type NodeAppReadyContext = NodeAppContext & {
  server: Bun.Server<any>;
};

export type ConsoleApp = {
  name?: string;
  routes?: (context: NodeAppContext) => NodeRoutes | Promise<NodeRoutes>;
  ready?: (context: NodeAppReadyContext) => void | Promise<void>;
};

export type ConsoleOptions = {
  openBrowser?: boolean | "ask";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function json(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

function routePathForAction(prefix: string, actionName: string): string {
  return `${prefix}/${actionName.replace("::", "/").replace(/_/g, "-")}`;
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
  const [actor = "TaskWish", action = actionName] = actionName.split("::");
  return {
    actor,
    action,
    label: humanize(action) || action,
  };
}

function uppercaseFirst(value: string): string {
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}

function isVisibleAction(action: ConsoleAction): boolean {
  if (action.mode === "chat") return true;
  return !action.action.toLowerCase().startsWith("on");
}

function metaForAction(action: Action): Record<string, unknown> {
  const meta = (action as unknown as Record<symbol, unknown>)[TW_META];
  return isRecord(meta) ? meta : {};
}

function inputSchemaForAction(action: Action): unknown {
  return (action as unknown as Record<symbol, unknown>)[TW_INPUT_SCHEMA];
}

function isArkSchemaString(value: string): boolean {
  return (
    PRIMITIVE_ARK_SCHEMAS.has(value) ||
    PRIMITIVE_ARK_SCHEMAS.has(value.replace(/\[\]$/, ""))
  );
}

function jsonSchemaFromArkSchema(
  schema: unknown,
): ConsoleJsonSchema | undefined {
  if (schema === undefined) return undefined;

  try {
    return arkType.raw(schema as never).toJsonSchema() as ConsoleJsonSchema;
  } catch {
    return undefined;
  }
}

function fieldExample(
  schema: ConsoleJsonSchema | undefined,
  metadata: Record<string, unknown> | undefined,
): unknown {
  if (metadata && "example" in metadata) return metadata.example;
  return schema?.examples?.[0];
}

function fieldDefaultValue(schema: ConsoleJsonSchema | undefined): unknown {
  return schema && "default" in schema ? schema.default : undefined;
}

function fieldDescription(
  schema: ConsoleJsonSchema | undefined,
  meta: unknown,
  metadata: Record<string, unknown> | undefined,
): string | undefined {
  if (metadata && typeof metadata.description === "string") {
    return metadata.description;
  }
  if (typeof schema?.description === "string") return schema.description;
  if (typeof meta === "string" && !isArkSchemaString(meta)) return meta;
  return undefined;
}

function fieldFromMeta(name: string, meta: unknown): ConsoleInputField {
  const schema =
    typeof meta === "string" && isArkSchemaString(meta)
      ? jsonSchemaFromArkSchema(meta)
      : isRecord(meta) && "schema" in meta
      ? jsonSchemaFromArkSchema(meta.schema)
      : undefined;
  const metadata = isRecord(meta) ? meta : undefined;

  return {
    name,
    description: fieldDescription(schema, meta, metadata),
    example: fieldExample(schema, metadata),
    defaultValue: fieldDefaultValue(schema),
    schema,
    metadata,
  };
}

function fieldsFromJsonSchema(
  schema: ConsoleJsonSchema | undefined,
  metadata: Record<string, unknown>,
): ConsoleInputField[] {
  if (!schema) return [];

  if (!isRecord(schema.properties)) {
    return [
      {
        name: "input",
        description: fieldDescription(schema, metadata.input, undefined),
        example: fieldExample(schema, undefined),
        defaultValue: fieldDefaultValue(schema),
        required: true,
        schema,
      },
    ];
  }

  return Object.entries(schema.properties).map(([name, property]) => {
    const fieldMeta = metadata[name];
    const fieldMetadata = isRecord(fieldMeta) ? fieldMeta : undefined;
    return {
      name,
      description: fieldDescription(property, fieldMeta, fieldMetadata),
      example: fieldExample(property, fieldMetadata),
      defaultValue: fieldDefaultValue(property),
      required: schema.required?.includes(name),
      schema: property,
      metadata: fieldMetadata,
    };
  });
}

function inputFieldsFromActionMeta(
  meta: Record<string, unknown>,
): ConsoleInputField[] {
  const input = meta.input;
  if (!isRecord(input)) return [];

  return Object.entries(input).map(([name, field]) =>
    fieldFromMeta(name, field),
  );
}

function actionInputMetadata(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  return isRecord(meta.input) ? meta.input : {};
}

function inputFieldsFromRouteMeta(
  meta: Record<string, unknown>,
): ConsoleInputField[] {
  const route = meta.route;
  if (!Array.isArray(route)) return [];

  const schema = route[2];
  if (!isRecord(schema)) return [];

  const fields: ConsoleInputField[] = [];
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

function inputSchemaFromRouteMeta(
  meta: Record<string, unknown>,
): ConsoleJsonSchema | undefined {
  const route = meta.route;
  if (!Array.isArray(route)) return undefined;

  const routeSchema = route[2];
  if (!isRecord(routeSchema)) return undefined;

  const schema: Record<string, unknown> = {};
  for (const section of ["params", "query", "body"] as const) {
    const value = routeSchema[section];
    if (isRecord(value)) Object.assign(schema, value);
  }

  return Object.keys(schema).length
    ? jsonSchemaFromArkSchema(schema)
    : undefined;
}

function sourceForMeta(meta: Record<string, unknown>): ConsoleAction["source"] {
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

function descriptionForMeta(meta: Record<string, unknown>): string | undefined {
  if (typeof meta.description === "string") return meta.description;

  const route = meta.route;
  if (Array.isArray(route) && isRecord(route[2])) {
    return typeof route[2].description === "string"
      ? route[2].description
      : undefined;
  }

  return undefined;
}

function isMessageEventAction(meta: Record<string, unknown>): boolean {
  return meta.event === "Message";
}

function describeAction(
  actionName: string,
  action: Action,
  routePrefix: string,
): ConsoleAction {
  const { actor, action: method, label } = actionParts(actionName);
  const meta = metaForAction(action);
  const chatAction = isMessageEventAction(meta);
  const inputSchema =
    jsonSchemaFromArkSchema(inputSchemaForAction(action)) ??
    inputSchemaFromRouteMeta(meta);
  const input = inputSchema
    ? fieldsFromJsonSchema(inputSchema, actionInputMetadata(meta))
    : [...inputFieldsFromActionMeta(meta), ...inputFieldsFromRouteMeta(meta)];

  return {
    id: actionName,
    actor,
    action: chatAction ? "chat" : method,
    label: chatAction ? "Chat" : uppercaseFirst(label),
    mode: chatAction ? "chat" : "form",
    description: descriptionForMeta(meta),
    route: routePathForAction(routePrefix, actionName),
    source: sourceForMeta(meta),
    input,
    inputSchema,
    meta,
  };
}

export function consoleConfig(
  registry: NodeRegistry,
  options: { nodeName: string; apiKey: string; prefix: string },
): ConsoleConfig {
  return {
    nodeName: options.nodeName,
    apiKey: options.apiKey,
    apiPrefix: options.prefix,
    actions: Array.from(registry.actions)
      .map(([actionName, action]) =>
        describeAction(actionName, action, options.prefix),
      )
      .filter(isVisibleAction)
      .sort((left, right) =>
        `${left.actor} ${left.label}`.localeCompare(
          `${right.actor} ${right.label}`,
        ),
      ),
  };
}

export function createConsoleRoutes(
  registry: NodeRegistry,
  options: { nodeName: string; apiKey: string; prefix: string },
): NodeRoutes {
  const config: NodeRouteHandler = () =>
    json(200, consoleConfig(registry, options));

  return {
    "/": consoleIndex,
    "/*": consoleIndex,
    [`${options.prefix}/console/config`]: {
      GET: config,
    },
  };
}

function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function shouldOpenBrowser(
  openBrowser: ConsoleOptions["openBrowser"],
): Promise<boolean> {
  if (openBrowser === true) return true;
  if (openBrowser === false) return false;
  if (!isInteractiveTerminal()) return false;

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await prompt.question("Open Console in browser? (Y/n) ");
    return !/^(n|no)$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

function browserOpenCommand(url: string): string[] {
  if (process.platform === "darwin") return ["open", url];
  if (process.platform === "win32") return ["cmd", "/c", "start", "", url];
  return ["xdg-open", url];
}

async function openBrowser(url: string): Promise<void> {
  const subprocess = Bun.spawn(browserOpenCommand(url), {
    stdout: "ignore",
    stderr: "ignore",
  });
  await subprocess.exited;
}

function handleOpenBrowserError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Could not open browser: ${message}`);
}

export function Console(options: ConsoleOptions = {}): ConsoleApp {
  return {
    name: "console",
    routes(context) {
      return createConsoleRoutes(context.registry, {
        nodeName: context.nodeName,
        apiKey: context.apiKey,
        prefix: context.prefix,
      });
    },
    async ready(context) {
      try {
        if (await shouldOpenBrowser(options.openBrowser ?? "ask")) {
          await openBrowser(context.server.url.origin);
        }
      } catch (error) {
        handleOpenBrowserError(error);
      }
    },
  };
}
