import { Step } from "taskwish";

import { actor } from "./gmail";

type GmailBody = {
  attachmentId?: string;
  data?: string;
  size?: number;
};

type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: { name?: string; value?: string }[];
  body?: GmailBody;
  parts?: GmailPart[];
};

type GmailMessage = {
  id?: string;
  threadId?: string;
  payload?: GmailPart;
};

function flattenParts(part: GmailPart | undefined): GmailPart[] {
  return part ? [part, ...(part.parts ?? []).flatMap(flattenParts)] : [];
}

function decodeBase64Url(value: string): Buffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(
    base64.padEnd(Math.ceil(base64.length / 4) * 4, "="),
    "base64"
  );
}

function header(part: GmailPart | undefined, name: string): string {
  return (
    part?.headers?.find(
      (item) => item.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

async function gmailJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(`Gmail request failed (HTTP ${response.status}).`);
  return (await response.json()) as T;
}

export const { getGmailMessage } = actor()
  .on("Command", "getGmailMessage")

  .input({ messageId: "string", "userId?": "string" })

  .run(
    Step("fetchMessage", async function () {
      const token = process.env.GMAIL_ACCESS_TOKEN;
      if (!token) throw new Error("GMAIL_ACCESS_TOKEN is required.");
      const messageId = this.input.messageId.trim();
      const userId = this.input.userId?.trim() || "me";
      if (!messageId) throw new Error("A Gmail messageId is required.");
      const base = `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}`;
      const message = await gmailJson<GmailMessage>(`${base}?format=full`, token);
      if (!message.id || !message.payload)
        throw new Error("Gmail returned an incomplete message.");
      return { base, message };
    }),

    Step("decodeMessage", async function () {
      const { base, message } = this.fetchMessage;
      const token = process.env.GMAIL_ACCESS_TOKEN!;
      const plainBodies: string[] = [];
      const htmlBodies: string[] = [];
      const attachments: { name: string; contentBase64: string }[] = [];
      let attachmentBytes = 0;

      for (const part of flattenParts(message.payload)) {
        const filename = part.filename?.trim();
        let data = part.body?.data;
        if (part.body?.attachmentId) {
          if (attachmentBytes + (part.body.size ?? 0) > 10_000_000)
            throw new Error("Gmail attachments exceed 10 MB total.");
          const attachmentId = encodeURIComponent(part.body.attachmentId);
          const attachment = await gmailJson<GmailBody>(
            `${base}/attachments/${attachmentId}`,
            token
          );
          data = attachment.data;
        }
        if (!data) continue;

        const bytes = decodeBase64Url(data);
        if (filename) {
          attachmentBytes += bytes.length;
          if (attachmentBytes > 10_000_000)
            throw new Error("Gmail attachments exceed 10 MB total.");
          attachments.push({
            name: filename,
            contentBase64: bytes.toString("base64"),
          });
        } else if (part.mimeType === "text/plain") {
          plainBodies.push(bytes.toString("utf8"));
        } else if (part.mimeType === "text/html") {
          htmlBodies.push(htmlToText(bytes.toString("utf8")));
        }
      }

      const body = (plainBodies.length ? plainBodies : htmlBodies)
        .join("\n\n")
        .trim();
      if (!body && !attachments.length)
        throw new Error("Gmail message has no readable body or attachments.");
      return {
        id: message.id,
        threadId: message.threadId ?? "",
        subject: header(message.payload, "subject"),
        from: header(message.payload, "from"),
        body,
        attachments,
      };
    })
  )

  .meta({
    description:
      "Fetch a Gmail message and decode its text body and document attachments",
    input: {
      messageId: {
        description: "Immutable Gmail message ID",
        example: "18f123456789abcd",
      },
      userId: {
        description: "Gmail address or me for the authenticated user",
        example: "me",
      },
    },
  });
