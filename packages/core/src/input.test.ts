import { describe, expect, test } from "bun:test";
import { type } from "arktype";

import { Input } from "./input";

describe("Input.File", () => {
  test("validates JSON-safe uploaded file values", () => {
    const File = Input.File({ accept: ".pdf", maxBytes: 10 });

    expect(File({ name: "load.pdf", contentBase64: "JVBERg==" })).toEqual({
      name: "load.pdf",
      contentBase64: "JVBERg==",
    });
    expect(File({ name: "load.pdf", contentBase64: "???" })).toBeInstanceOf(
      type.errors,
    );
  });

  test("exposes file-picker metadata in JSON Schema", () => {
    const File = Input.File({ accept: ".pdf", maxBytes: 100 });
    const schema = File["~standard"].jsonSchema.input({
      target: "draft-2020-12",
    });

    expect(schema).toMatchObject({
      type: "object",
      format: "taskwish-file",
      "x-taskwish-accept": ".pdf",
      "x-taskwish-max-bytes": 100,
    });
  });

  test("rejects invalid byte limits", () => {
    expect(() => Input.File({ maxBytes: 0 })).toThrow("positive safe integer");
  });
});
