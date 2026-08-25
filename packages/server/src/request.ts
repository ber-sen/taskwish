import { isRecord } from "./utils";

export async function parseActionInput(request: Request): Promise<unknown[]> {
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

export function matchPathParams(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index++) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (patternPart?.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart ?? "");
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

async function parseRouteBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") return undefined;

  const contentLength = request.headers.get("Content-Length");
  if (contentLength === "0") return undefined;

  const contentType = request.headers.get("Content-Type") ?? "";
  const text = await request.text();
  if (text.length === 0) return undefined;

  if (contentType.includes("application/json")) return JSON.parse(text);

  return text;
}

export async function routeInputFromRequest(
  routePath: string,
  request: Request,
): Promise<Record<string, unknown>> {
  const url = new URL(request.url);
  const input: Record<string, unknown> = {
    path: url.pathname,
    params: matchPathParams(routePath, url.pathname) ?? {},
    query: Object.fromEntries(url.searchParams.entries()),
  };

  const body = await parseRouteBody(request);
  if (body !== undefined) input.body = body;

  return input;
}

export function flattenRouteInput(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  if (isRecord(raw.params)) Object.assign(flat, raw.params);
  if (isRecord(raw.query)) Object.assign(flat, raw.query);
  if (isRecord(raw.body)) Object.assign(flat, raw.body);
  return flat;
}
