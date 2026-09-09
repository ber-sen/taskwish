import { expect, test } from "bun:test";

import { Documents } from ".";
import { samplePdf } from "../shared/test-helpers";

test("combines email text and real Anydoc document conversion", async () => {
  const result = await Documents.readDocuments({
    emailText: "Please book this load.",
    attachments: [
      { name: "tender.pdf", contentBase64: samplePdf() },
      {
        name: "charges.csv",
        contentBase64: Buffer.from("type,amount\nlinehaul,1850\n").toString(
          "base64"
        ),
      },
    ],
  });
  expect(result.markdown).toContain("Please book this load.");
  expect(result.markdown).toContain("Freight tender BOL-1042");
  expect(result.markdown).toContain("linehaul");
});

test("rejects missing source, malformed documents, bad base64, and oversized text", async () => {
  await expect(Documents.readDocuments({})).rejects.toThrow(
    "Provide emailText"
  );
  await expect(
    Documents.readDocuments({
      attachments: [
        {
          name: "secret.xlsx",
          contentBase64: Buffer.from("not a document").toString("base64"),
        },
      ],
    })
  ).rejects.toThrow();
  await expect(
    Documents.readDocuments({
      attachments: [{ name: "bad.pdf", contentBase64: "???" }],
    })
  ).rejects.toThrow("valid base64");
  await expect(
    Documents.readDocuments({ emailText: "a".repeat(120_001) })
  ).rejects.toThrow("120,000");
});

test("does not silently extract only email when an attachment fails", async () => {
  await expect(
    Documents.readDocuments({
      emailText: "Book it",
      attachments: [
        {
          name: "broken.pdf",
          contentBase64: Buffer.from("%PDF-1.4 broken").toString("base64"),
        },
      ],
    })
  ).rejects.toThrow();
});
