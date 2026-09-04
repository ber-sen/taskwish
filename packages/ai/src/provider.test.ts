import { describe, expect, expectTypeOf, test } from "bun:test";

import { TW } from "@taskwish/core";

import { Provider, type ProviderModelName } from "./provider";

describe("Provider", () => {
  test("registers each model under its provider-qualified name", () => {
    const { Ollama } = Provider("Ollama", {
      baseURL: "http://127.0.0.1:11434/v1",
      models: ["qwen3:4b", "qwen3:8b"],
    });
    const scope = Ollama[TW.Scope];
    const providers = scope[TW.Provider];
    type ModelName = ProviderModelName<
      (typeof providers)[keyof typeof providers]
    >;

    expect(Object.keys(scope)).toEqual([]);
    expect(Object.keys(providers)).toEqual(["Ollama"]);
    expect(providers.Ollama.models).toEqual(["qwen3:4b", "qwen3:8b"]);
    expectTypeOf<ModelName>().toEqualTypeOf<
      "ollama/qwen3:4b" | "ollama/qwen3:8b"
    >();
    expect((providers.Ollama.model("qwen3:4b") as any).modelId).toBe(
      "qwen3:4b"
    );
  });
});
