import { describe, expect, test } from "bun:test";

import {
  acceptsFile,
  encodeFiles,
  fileInputConfig,
  type FileInputConfig,
} from "./file-input";

const config: FileInputConfig = {
  multiple: true,
  accept: ".pdf,application/msword",
  maxBytes: 100,
  maxFiles: 2,
};

describe("file inputs", () => {
  test("reads picker configuration from scalar and list schemas", () => {
    expect(
      fileInputConfig({
        name: "document",
        schema: {
          type: "object",
          format: "taskwish-file",
          "x-taskwish-accept": ".pdf",
          "x-taskwish-max-bytes": 25,
        },
      }),
    ).toEqual({
      multiple: false,
      accept: ".pdf",
      maxBytes: 25,
      maxFiles: 1,
    });
    expect(
      fileInputConfig({
        name: "documents",
        schema: {
          type: "array",
          maxItems: 5,
          items: { type: "object", format: "taskwish-file" },
        },
      }),
    ).toMatchObject({ multiple: true, maxFiles: 5 });
  });

  test("matches extensions and MIME types", () => {
    expect(acceptsFile({ name: "load.PDF", type: "" }, config.accept)).toBe(
      true,
    );
    expect(
      acceptsFile(
        { name: "load.doc", type: "application/msword" },
        config.accept,
      ),
    ).toBe(true);
    expect(acceptsFile({ name: "load.txt", type: "text/plain" }, config.accept)).toBe(
      false,
    );
  });

  test("encodes selected files and enforces picker limits", async () => {
    await expect(
      encodeFiles([new File(["%PDF-"], "load.pdf")], config),
    ).resolves.toEqual([
      { name: "load.pdf", contentBase64: "JVBERi0=" },
    ]);
    await expect(
      encodeFiles([new File(["x".repeat(101)], "large.pdf")], config),
    ).rejects.toThrow("limit");
    await expect(
      encodeFiles([new File(["text"], "load.txt")], config),
    ).rejects.toThrow("choose");
  });
});
