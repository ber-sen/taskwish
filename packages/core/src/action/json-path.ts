type JsonPathSegment =
  | { type: "property"; value: string }
  | { type: "index"; value: number }
  | {
      type: "slice";
      start?: number;
      end?: number;
      step?: number;
    }
  | { type: "wildcard" };

// Not supported from RFC 9535:
// - descendant segments: $..name, $..*
// - filter selectors and functions: [?@.price < 10], length(), count(), etc.
// - multiple selectors: $[0,1], $['a','b']
// - negative indexes: $[-1]
// - dot and object wildcards: $.*, $['object'][*]
// - full quoted-name escaping and Unicode shorthand names
//
// Intentional/current semantic differences:
// - singular paths return a scalar instead of a one-item nodelist
// - missing values in multi-result paths are retained as undefined
// - [::0] throws, while RFC 9535 defines it as an empty result
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

      const close = path.indexOf("]", position);
      if (close !== -1) {
        const value = path.slice(position, close);
        const slice = /^(-?\d*):(-?\d*)(?::(-?\d*))?$/.exec(value);
        if (slice !== null) {
          const step = slice[3] === undefined || slice[3] === ""
            ? undefined
            : Number(slice[3]);
          if (step === 0) throw new JSONPathSyntaxError(path, start);
          segments.push({
            type: "slice",
            start: slice[1] === "" ? undefined : Number(slice[1]),
            end: slice[2] === "" ? undefined : Number(slice[2]),
            step,
          });
          position = close + 1;
          continue;
        }
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

function sliceArray(
  value: unknown[],
  start: number | undefined,
  end: number | undefined,
  step = 1,
): unknown[] {
  const length = value.length;
  const normalize = (index: number) => index < 0 ? length + index : index;
  const result: unknown[] = [];

  if (step > 0) {
    const first = Math.min(Math.max(start === undefined ? 0 : normalize(start), 0), length);
    const last = Math.min(Math.max(end === undefined ? length : normalize(end), 0), length);
    for (let index = first; index < last; index += step) {
      result.push(value[index]);
    }
    return result;
  }

  const first = start === undefined
    ? length - 1
    : Math.min(Math.max(normalize(start), -1), length - 1);
  const last = end === undefined
    ? -1
    : Math.min(Math.max(normalize(end), -1), length - 1);
  for (let index = first; index > last; index += step) {
    result.push(value[index]);
  }
  return result;
}

export function queryJsonPath(object: unknown, path: string): unknown {
  const segments = parseJsonPath(path);
  let values: unknown[] = [object];
  for (const segment of segments) {
    const next: unknown[] = [];
    for (const value of values) {
      if (segment.type === "wildcard") {
        if (Array.isArray(value)) next.push(...value);
      } else if (segment.type === "slice") {
        if (Array.isArray(value)) {
          next.push(
            ...sliceArray(value, segment.start, segment.end, segment.step),
          );
        }
      } else if (segment.type === "index") {
        if (Array.isArray(value)) next.push(value[segment.value]);
      } else if (value !== null && typeof value === "object") {
        next.push((value as Record<string, unknown>)[segment.value]);
      }
    }
    values = next;
  }
  return segments.some(
    (segment) => segment.type === "wildcard" || segment.type === "slice",
  )
    ? values
    : values[0];
}
