type JsonPathSegment =
  | { type: "property"; value: string }
  | { type: "index"; value: number }
  | { type: "wildcard" };

export class JSONPathSyntaxError extends Error {
  readonly name = "JSONPathSyntaxError";

  constructor(path: string, position: number) {
    super(`Invalid JSONPath at position ${position}: ${path}`);
  }
}

export function parseJsonPath(path: string): JsonPathSegment[] {
  if (path[0] !== "$") throw new JSONPathSyntaxError(path, 0);

  const segments: JsonPathSegment[] = [];
  let position = 1;

  while (position < path.length) {
    if (path[position] === ".") {
      const start = ++position;
      if (!/[A-Za-z_$]/.test(path[position] ?? "")) {
        throw new JSONPathSyntaxError(path, position);
      }
      while (position < path.length && /[A-Za-z0-9_$]/.test(path[position])) {
        position++;
      }
      segments.push({
        type: "property",
        value: path.slice(start, position),
      });
      continue;
    }

    if (path[position] === "[") {
      const start = position++;
      const quote = path[position];
      if (quote === '"' || quote === "'") {
        position++;
        let property = "";
        while (position < path.length && path[position] !== quote) {
          if (path[position] === "\\") {
            position++;
            if (position >= path.length) {
              throw new JSONPathSyntaxError(path, start);
            }
          }
          property += path[position++];
        }
        if (path[position] !== quote || path[position + 1] !== "]") {
          throw new JSONPathSyntaxError(path, start);
        }
        segments.push({ type: "property", value: property });
        position += 2;
        continue;
      }

      if (path[position] === "*" && path[position + 1] === "]") {
        segments.push({ type: "wildcard" });
        position += 2;
        continue;
      }

      const indexStart = position;
      while (position < path.length && /[0-9]/.test(path[position])) {
        position++;
      }
      if (
        position === indexStart ||
        path[position] !== "]"
      ) {
        throw new JSONPathSyntaxError(path, start);
      }
      segments.push({
        type: "index",
        value: Number(path.slice(indexStart, position)),
      });
      position++;
      continue;
    }

    throw new JSONPathSyntaxError(path, position);
  }

  return segments;
}

export function queryJsonPath(object: unknown, path: string): unknown {
  const segments = parseJsonPath(path);
  let values: unknown[] = [object];
  for (const segment of segments) {
    const next: unknown[] = [];
    for (const value of values) {
      if (segment.type === "wildcard") {
        if (Array.isArray(value)) next.push(...value);
      } else if (segment.type === "index") {
        if (Array.isArray(value)) next.push(value[segment.value]);
      } else if (value !== null && typeof value === "object") {
        next.push((value as Record<string, unknown>)[segment.value]);
      }
    }
    values = next;
  }
  return segments.some((segment) => segment.type === "wildcard")
    ? values
    : values[0];
}
