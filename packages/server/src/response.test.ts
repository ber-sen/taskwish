import { expect, test } from "bun:test";
import { fetchActionResult } from "./test-helpers";

test("maps action results with Bun response-friendly constructors", async () => {
  const objectResponse = await fetchActionResult({ ok: true });
  expect(objectResponse.status).toBe(200);
  expect(objectResponse.headers.get("Content-Type")).toStartWith(
    "application/json",
  );
  expect(await objectResponse.json()).toEqual({ ok: true });

  const arrayResponse = await fetchActionResult(["a", "b"]);
  expect(arrayResponse.status).toBe(200);
  expect(await arrayResponse.json()).toEqual(["a", "b"]);

  const blobResponse = await fetchActionResult(
    new Blob(["hello"], { type: "text/custom" }),
  );
  expect(blobResponse.status).toBe(200);
  expect(blobResponse.headers.get("Content-Type")).toBe("text/custom");
  expect(await blobResponse.text()).toBe("hello");

  const streamResponse = await fetchActionResult(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("streamed"));
        controller.close();
      },
    }),
  );
  expect(streamResponse.status).toBe(200);
  expect(await streamResponse.text()).toBe("streamed");

  const numberResponse = await fetchActionResult(42);
  expect(numberResponse.status).toBe(200);
  expect(await numberResponse.text()).toBe("42");
});

test("maps returned functions and custom toResponse values", async () => {
  const functionResponse = await fetchActionResult(() => ({ ok: true }));
  expect(functionResponse.status).toBe(200);
  expect(await functionResponse.json()).toEqual({ ok: true });

  class CustomResponse {
    toResponse() {
      return new Response("created", { status: 201 });
    }
  }

  const customResponse = await fetchActionResult(new CustomResponse());
  expect(customResponse.status).toBe(201);
  expect(await customResponse.text()).toBe("created");
});

test("streams returned async generators", async () => {
  async function* chunks() {
    yield "one\n";
    yield new TextEncoder().encode("two\n");
    yield { step: 3 };
  }

  const response = await fetchActionResult(chunks());

  expect(response.status).toBe(200);
  expect(await response.text()).toBe('one\ntwo\n{"step":3}');
});

test("maps returned errors as error responses", async () => {
  const response = await fetchActionResult(new TypeError("invalid result"));

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({
    name: "TypeError",
    message: "invalid result",
  });
});
