import { expect, test } from "bun:test";

import { Documents } from ".";
import { samplePdf } from "../shared/test-helpers";

test("combines uploaded document content as Markdown", async () => {
  const result = await Documents.readDocuments({
    attachments: [
      { name: "sample.pdf", contentBase64: samplePdf() },
      {
        name: "details.csv",
        contentBase64: Buffer.from("reference,weight\nBOL-7,12000\n").toString(
          "base64",
        ),
      },
    ],
  });

  expect(result.markdown).toContain("Example document");
  expect(result.markdown).toContain("BOL-7");
});

test("rejects missing and malformed documents", async () => {
  await expect(Documents.readDocuments({ attachments: [] })).rejects.toThrow(
    "at least one document",
  );
  await expect(
    Documents.readDocuments({
      attachments: [{ name: "bad.pdf", contentBase64: "???" }],
    }),
  ).rejects.toThrow("valid base64");
  await expect(
    Documents.readDocuments({
      attachments: [
        {
          name: "notes.docx",
          contentBase64: Buffer.from("not a document").toString("base64"),
        },
      ],
    }),
  ).rejects.toThrow();
});
