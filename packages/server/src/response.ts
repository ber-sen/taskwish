import { isRecord } from "./utils";

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

type ResponseLike = {
  toResponse: () => unknown;
};

type IteratorLike = {
  next: () =>
    | IteratorResult<unknown, unknown>
    | Promise<IteratorResult<unknown, unknown>>;
  return?: () =>
    | IteratorResult<unknown, unknown>
    | Promise<IteratorResult<unknown, unknown>>;
};

function hasToResponse(value: unknown): value is ResponseLike {
  return (
    isRecord(value) &&
    typeof (value as Record<string, unknown>).toResponse === "function"
  );
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    isRecord(value) &&
    typeof (value as Record<string, unknown>).then === "function"
  );
}

function isIterator(value: unknown): value is IteratorLike {
  return (
    isRecord(value) &&
    typeof (value as Record<string, unknown>).next === "function"
  );
}

export async function streamChunk(chunk: unknown): Promise<Uint8Array> {
  if (chunk instanceof Uint8Array) return chunk;
  if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk);
  if (ArrayBuffer.isView(chunk)) {
    return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  }
  if (chunk instanceof Blob) return new Uint8Array(await chunk.arrayBuffer());

  const text =
    typeof chunk === "string"
      ? chunk
      : (JSON.stringify(chunk) ?? String(chunk));

  return new TextEncoder().encode(text);
}

function streamFromIterator(iterator: IteratorLike): Response {
  return new Response(
    new ReadableStream({
      async pull(controller) {
        const item = await iterator.next();
        if (item.done) {
          controller.close();
          return;
        }

        controller.enqueue(await streamChunk(item.value));
      },
      async cancel() {
        await iterator.return?.();
      },
    }),
  );
}

function returnedErrorResponse(error: Error): Response {
  return Response.json(
    {
      name: error.name,
      message: error.message,
      cause: error.cause,
    },
    { status: 500 },
  );
}

export function responseFrom(result: unknown): Response | Promise<Response> {
  switch (result?.constructor?.name) {
    case "String":
      return new Response(result as string, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });

    case "Object":
    case "Array":
      return Response.json(result);

    case "Response":
      return result as Response;

    case "Blob":
    case "File":
      return new Response(result as Blob);

    case "ReadableStream":
      return new Response(result as ReadableStream);

    case "FormData":
      return new Response(result as FormData);

    case "Number":
    case "Boolean":
      return new Response((result as number | boolean).toString());

    case "Error":
      return returnedErrorResponse(result as Error);

    case "Promise":
      return (result as Promise<unknown>).then(responseFrom);

    case "Function":
      return responseFrom((result as () => unknown)());

    case undefined:
      if (result === undefined) return new Response(null, { status: 204 });
      if (result === null) return Response.json(result);
      break;
  }

  if (result instanceof Response) return result;
  if (result instanceof Blob) return new Response(result);
  if (result instanceof ReadableStream) return new Response(result);
  if (result instanceof FormData) return new Response(result);
  if (result instanceof Error) return returnedErrorResponse(result);
  if (result instanceof Promise) return result.then(responseFrom);
  if (isThenable(result)) return Promise.resolve(result).then(responseFrom);
  if (isIterator(result)) return streamFromIterator(result);
  if (hasToResponse(result)) return responseFrom(result.toResponse());
  if (typeof result === "function") return responseFrom(result());
  if (Array.isArray(result)) return Response.json(result);

  switch (typeof result) {
    case "string":
      return new Response(result, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });

    case "number":
    case "boolean":
    case "bigint":
      return new Response(result.toString());

    case "undefined":
      return new Response(null, { status: 204 });

    case "object":
      if (result === null) return Response.json(result);
      return Response.json(result);

    default:
      return new Response(String(result), {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
  }
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

export function errorResponse(error: unknown): Response {
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
