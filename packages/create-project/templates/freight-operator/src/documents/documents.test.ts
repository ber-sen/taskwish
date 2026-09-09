import { expect, test } from "bun:test";

import { Documents } from ".";
import { samplePdf } from "../shared/test-helpers";

test("combines real Anydoc document conversions", async () => {
  const result = await Documents.readDocuments({
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
  expect(result.markdown).toContain("Freight tender BOL-1042");
  expect(result.markdown).toContain("linehaul");
});

test("rejects missing source, malformed documents, and bad base64", async () => {
  await expect(Documents.readDocuments({ attachments: [] })).rejects.toThrow(
    "at least one document"
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
});

test("does not silently skip a malformed attachment", async () => {
  await expect(
    Documents.readDocuments({
      attachments: [
        {
          name: "broken.pdf",
          contentBase64: Buffer.from("%PDF-1.4 broken").toString("base64"),
        },
      ],
    })
  ).rejects.toThrow();
});
