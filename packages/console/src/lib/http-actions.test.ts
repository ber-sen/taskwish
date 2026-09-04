import { describe, expect, test } from "bun:test";

import type { ConsoleAction } from "../types";
import { httpRequestExample, httpRouteForAction } from "./http-actions";

const webhook = {
  id: "GitHub::receiveIssueWebhook",
  actor: "GitHub",
  action: "receiveIssueWebhook",
  label: "Receive issue webhook",
  mode: "form",
  route: "/tw/GitHub/receive-issue-webhook",
  source: "http",
  input: [],
  meta: {
    route: [
      "POST",
      "/integrations/github/issues",
      {
        body: {
          action: "string",
          issue: { number: "number", title: "string" },
        },
      },
    ],
  },
} satisfies ConsoleAction;

describe("HTTP action usage", () => {
  test("reads the public method and path from route metadata", () => {
    expect(httpRouteForAction(webhook)).toEqual({
      method: "POST",
      path: "/integrations/github/issues",
      body: {
        action: "string",
        issue: { number: "number", title: "string" },
      },
    });
  });

  test("creates a curl example with authentication and a sample body", () => {
    const example = httpRequestExample(webhook, "http://localhost:3000");

    expect(example).toContain(
      "curl --request POST 'http://localhost:3000/integrations/github/issues'",
    );
    expect(example).toContain("Authorization: Bearer $TASKWISH_API_KEY");
    expect(example).toContain('"number": 0');
  });
});
