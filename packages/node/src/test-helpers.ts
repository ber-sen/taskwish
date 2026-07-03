import { Actor } from "@taskwish/core";
import { createFetchHandler, createNodeRegistry } from "./index";

export const apiKey = "test-api-key";
export const auth = { Authorization: `Bearer ${apiKey}` };

export async function fetchActionResult(result: unknown): Promise<Response> {
  const { Responder } = Actor("Responder");
  const { value } = Responder()
    .on("Command", "value")
    .run(function () {
      return result;
    });

  const fetch = createFetchHandler(
    createNodeRegistry([Promise.resolve({ Responder, value })]),
    { apiKey },
  );

  return fetch(
    new Request("http://localhost/tw/Responder/value", {
      method: "POST",
      headers: auth,
    }),
  );
}
