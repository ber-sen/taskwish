import { Input, Step } from "taskwish";

import { actor } from "./documents";

export const { readDocuments } = actor()
  .on("Command", "readDocuments")

  .input({
    "emailText?": "string",
    "attachments?": Input.List(
      Input.File({ maxBytes: 10_000_000 }),
    ),
  })

  .run(
    Step("readSource", async function () {
      const sections: string[] = [];
      if (this.input.emailText?.trim()) {
        sections.push(`Email body:\n${this.input.emailText.trim()}`);
      }
      const attachments = this.input.attachments ?? [];
      let totalBytes = Buffer.byteLength(this.input.emailText ?? "");
      for (const attachment of attachments) {
        if (
          attachment.contentBase64.length > 14_000_000 ||
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
            attachment.contentBase64,
          )
        ) {
          throw new Error(
            "Document content must be valid base64, at most 10 MB.",
          );
        }
        const bytes = Buffer.from(attachment.contentBase64, "base64");
        totalBytes += bytes.length;
        if (totalBytes > 10_000_000) {
          throw new Error("Combined source exceeds 10 MB.");
        }
        const { formatFromPath, toMarkdownBytes } = await import(
          "@firecrawl/anydoc"
        );
        const markdown = await toMarkdownBytes(
          bytes,
          formatFromPath(attachment.name),
          {
            ocr: process.env.ANYDOC_OCR === "hosted" ? "hosted" : "reject",
          },
        );
        if (!markdown.trim()) {
          throw new Error(
            `${attachment.name}: no readable text. Check OCR settings.`,
          );
        }
        sections.push(`Document attachment: ${attachment.name}\n${markdown}`);
      }
      const markdown = sections.join("\n\n---\n\n");
      if (!markdown.trim()) {
        throw new Error("Provide emailText or at least one document attachment.");
      }
      if (markdown.length > 120_000) {
        throw new Error(
          "Source text exceeds 120,000 characters; split the documents.",
        );
      }
      return { markdown };
    }),
  )

  .meta({
    description:
      "Read email text and convert uploaded documents to Markdown with Anydoc",
    input: {
      emailText: {
        description: "Optional plain-text content to include",
        example: "Please review the attached document…",
      },
      attachments: {
        description: "Upload documents supported by Anydoc, up to 10 MB total",
      },
    },
  });
