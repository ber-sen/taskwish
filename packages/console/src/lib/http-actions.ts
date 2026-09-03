import type { ConsoleAction } from "../types";

type HttpRoute = {
  method: string;
  path: string;
  body?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exampleForSchema(schema: unknown): unknown {
  if (typeof schema === "string") {
    if (schema.includes("boolean")) return false;
    if (schema.includes("number")) return 0;
    return "string";
  }
  if (!isRecord(schema)) return undefined;
  if ("example" in schema) return schema.example;
  if ("default" in schema) return schema.default;

  if (schema.type === "array") {
    const example = exampleForSchema(schema.items);
    return example === undefined ? [] : [example];
  }
  if (schema.type === "string") return "string";
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "boolean") return false;

  const properties = isRecord(schema.properties)
    ? schema.properties
    : schema.type === "object"
      ? {}
      : schema;
  return Object.fromEntries(
    Object.entries(properties)
      .map(([name, value]) => [name, exampleForSchema(value)] as const)
      .filter((entry) => entry[1] !== undefined),
  );
}

export function httpRouteForAction(action: ConsoleAction): HttpRoute | null {
  if (action.source !== "http" || !isRecord(action.meta)) return null;
  const route = action.meta.route;
  if (
    !Array.isArray(route) ||
    typeof route[0] !== "string" ||
    typeof route[1] !== "string"
  ) {
    return null;
  }

  const schema = isRecord(route[2]) ? route[2] : undefined;
  return {
    method: route[0].toUpperCase(),
    path: route[1],
    ...(schema && "body" in schema ? { body: schema.body } : {}),
  };
}

export function httpRequestExample(
  action: ConsoleAction,
  origin: string,
): string | null {
  const route = httpRouteForAction(action);
  if (!route) return null;

  const lines = [
    `curl --request ${route.method} '${origin}${route.path}'`,
    '  --header "Authorization: Bearer $TASKWISH_API_KEY"',
  ];
  if (route.body !== undefined) {
    lines.push('  --header "Content-Type: application/json"');
    lines.push(
      `  --data '${JSON.stringify(exampleForSchema(route.body), null, 2)}'`,
    );
  }
  return lines.join(" \\\n");
}
