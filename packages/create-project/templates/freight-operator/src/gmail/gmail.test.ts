import { afterEach, expect, mock, test } from "bun:test";

import { Gmail } from ".";

const originalFetch = globalThis.fetch;
const originalToken = process.env.GMAIL_ACCESS_TOKEN;

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.GMAIL_ACCESS_TOKEN;
  else process.env.GMAIL_ACCESS_TOKEN = originalToken;
});

test("fetches and decodes a Gmail message with an attachment", async () => {
  process.env.GMAIL_ACCESS_TOKEN = "gmail-token";
  const fetchMock = mock(
    async (input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/attachments/attachment-1"))
        return Response.json({
          data: base64Url("reference,weight\nBOL-7,12000"),
        });
      return Response.json({
        id: "message-1",
        threadId: "thread-1",
        payload: {
          mimeType: "multipart/mixed",
          headers: [
            { name: "Subject", value: "Load BOL-7" },
            { name: "From", value: "shipper@example.com" },
          ],
          parts: [
            {
              mimeType: "text/plain",
              body: { data: base64Url("Please book the attached load.") },
            },
            {
              mimeType: "text/csv",
              filename: "tender.csv",
              body: { attachmentId: "attachment-1", size: 29 },
            },
          ],
        },
      });
    }
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const message = await Gmail.getGmailMessage({ messageId: "message-1" });

  expect(message).toMatchObject({
    id: "message-1",
    threadId: "thread-1",
    subject: "Load BOL-7",
    from: "shipper@example.com",
    body: "Please book the attached load.",
    attachments: [{ name: "tender.csv" }],
  });
  expect(
    Buffer.from(message.attachments[0]!.contentBase64, "base64").toString()
  ).toContain("BOL-7");
  expect(fetchMock.mock.calls[0]![0]).toBe(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/message-1?format=full"
  );
  expect(fetchMock.mock.calls[0]![1]?.headers).toEqual({
    Authorization: "Bearer gmail-token",
  });
});

test("requires Gmail credentials before fetching", async () => {
  delete process.env.GMAIL_ACCESS_TOKEN;
  await expect(
    Gmail.getGmailMessage({ messageId: "message-1" })
  ).rejects.toThrow("GMAIL_ACCESS_TOKEN");
});
