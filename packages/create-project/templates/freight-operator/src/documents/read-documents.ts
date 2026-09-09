import { Step } from "taskwish";

import { actor } from "./documents";

export const intakeDefinition = {
  "emailText?": "string",
  "attachments?": [{ name: "string", contentBase64: "string" }, "[]"],
} as const;

export const { readDocuments } = actor()
  .on("Command", "readDocuments")

  .input(intakeDefinition)

  .run(
    Step("readSource", async function () {
      const sections: string[] = [];
      if (this.input.emailText?.trim())
        sections.push(`Email body:\n${this.input.emailText.trim()}`);
      const attachments = this.input.attachments ?? [];
      if (attachments.length > 5)
        throw new Error("At most five PDF attachments are supported per load.");
      let totalBytes = Buffer.byteLength(this.input.emailText ?? "");
      for (const attachment of attachments) {
        if (
          attachment.contentBase64.length > 14_000_000 ||
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
            attachment.contentBase64
          )
        ) {
          throw new Error("PDF content must be valid base64, at most 10 MB.");
        }
        const bytes = Buffer.from(attachment.contentBase64, "base64");
        totalBytes += bytes.length;
        if (totalBytes > 10_000_000)
          throw new Error("Combined source exceeds 10 MB.");
        if (bytes.subarray(0, 5).toString() !== "%PDF-")
          throw new Error(`${attachment.name}: expected a PDF.`);
        const { toMarkdownBytes } = await import("@firecrawl/anydoc");
        const markdown = await toMarkdownBytes(bytes, null, {
          ocr: process.env.ANYDOC_OCR === "hosted" ? "hosted" : "reject",
        });
        if (!markdown.trim())
          throw new Error(
            `${attachment.name}: no readable text. Check OCR settings.`
          );
        sections.push(`PDF attachment: ${attachment.name}\n${markdown}`);
      }
      const markdown = sections.join("\n\n---\n\n");
      if (!markdown.trim())
        throw new Error("Provide emailText or at least one PDF attachment.");
      if (markdown.length > 120_000)
        throw new Error(
          "Source text exceeds 120,000 characters; split the documents by load."
        );
      return { markdown };
    })
  )

  .meta({
    description:
      "Read email text and convert PDF attachments to Markdown with Anydoc",
    input: {
      emailText: {
        description: "Decoded plain-text email body",
        example: "Please book load BOL-1042…",
      },
      attachments: {
        description: "PDF names and raw base64 content, up to 10 MB total",
      },
    },
  });
