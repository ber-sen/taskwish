import { describe, expect, test } from "bun:test";
import { Expect, Equal } from "./helpers";
import { TW } from "./core";
import { Trait } from "./trait";

describe("Trait", () => {
  // ── anonymous form: Trait<T>() ─────────────────────────────────────────────

  test("anonymous — returns an object directly", () => {
    const instance = Trait<{ log: () => string }>();

    expect(typeof instance).toBe("object");
  });

  test("anonymous — each method is tagged with TW.Name as bare method name", () => {
    const { log } = Trait<{ log: () => string }>();

    expect((log as any)[TW.Name]).toBe("log");
  });

  test("anonymous — each method carries TW.Meta { trait: true } at runtime", () => {
    const { log } = Trait<{ log: () => string }>();

    expect((log as any)[TW.Meta]).toEqual({ trait: true });
  });

  test("anonymous — type: single method wrapped in TW.Action with bare key", () => {
    const { log } = Trait<{ log: () => string }>();

    type check = Expect<
      Equal<
        typeof log,
        TW.Action<"log", () => Promise<string>, { trait: true }>
      >
    >;
  });

  test("anonymous — type: already-Promise return is not double-wrapped", () => {
    const { get } = Trait<{ get: (key: string) => Promise<string> }>();

    type check = Expect<
      Equal<
        typeof get,
        TW.Action<"get", (key: string) => Promise<string>, { trait: true }>
      >
    >;
  });

  test("anonymous — type: multi-method shape, each keyed by bare method name", () => {
    const { get, post } = Trait<{
      get: (url: string) => Promise<Response>;
      post: (url: string, body: unknown) => Promise<Response>;
    }>();

    type checkGet = Expect<
      Equal<
        typeof get,
        TW.Action<"get", (url: string) => Promise<Response>, { trait: true }>
      >
    >;
    type checkPost = Expect<
      Equal<
        typeof post,
        TW.Action<
          "post",
          (url: string, body: unknown) => Promise<Response>,
          { trait: true }
        >
      >
    >;
  });

  test("anonymous — type: existing TW.Action meta is merged with { trait: true }", () => {
    const { log } = Trait<{
      log: TW.Action<"log", () => Promise<string>, { service: "logger" }>;
    }>();

    type check = Expect<
      Equal<
        typeof log,
        TW.Action<"log", () => Promise<string>, { service: "logger"; trait: true }>
      >
    >;
  });

  // ── named form: Trait("Name") ──────────────────────────────────────────────

  test("returns an object keyed by the trait name", () => {
    const result = Trait("Logger");

    expect(typeof result).toBe("object");
    expect(typeof (result as any).Logger).toBe("function");
  });

  test("calling the trait factory returns an object", () => {
    const { Logger } = Trait("Logger");

    const instance = Logger<{ log: () => string }>();

    expect(typeof instance).toBe("object");
  });

  test("each method is tagged with TW.Name as 'TraitName::method'", () => {
    const { Logger } = Trait("Logger");

    const { log } = Logger<{ log: () => string }>();

    expect((log as any)[TW.Name]).toBe("Logger::log");
  });

  test("each method is tagged with TW.Name as 'TraitName::method'", () => {
    const { Logger } = Trait("Logger");

    const { log } = Logger<{
      log: TW.Action<
        "Logger::log",
        () => Promise<string>,
        { service: "logger" }
      >;
    }>();

    expect((log as any)[TW.Name]).toBe("Logger::log");

    type check = Expect<
      Equal<
        typeof log,
        TW.Action<
          "Logger::log",
          () => Promise<string>,
          {
            service: "logger";
            trait: true;
          }
        >
      >
    >;
  });

  test("each method carries TW.Meta { trait: true } at runtime", () => {
    const { Logger } = Trait("Logger");

    const { log } = Logger<{ log: () => string }>();

    expect((log as any)[TW.Meta]).toEqual({ trait: true });
  });

  test("type — single method is wrapped in TW.Action with { trait: true } meta", () => {
    const { Logger } = Trait("Logger");

    const { log } = Logger<{ log: () => string }>();

    type check = Expect<
      Equal<
        typeof log,
        TW.Action<"Logger::log", () => Promise<string>, { trait: true }>
      >
    >;
  });

  test("type — already-Promise return is not double-wrapped", () => {
    const { Cache } = Trait("Cache");

    const { get } = Cache<{ get: (key: string) => Promise<string> }>();

    type check = Expect<
      Equal<
        typeof get,
        TW.Action<
          "Cache::get",
          (key: string) => Promise<string>,
          { trait: true }
        >
      >
    >;
  });

  test("type — multi-method shape, each keyed as TraitName::method", () => {
    const { HttpClient } = Trait("HttpClient");

    const { get, post } = HttpClient<{
      get: (url: string) => Promise<Response>;
      post: (url: string, body: unknown) => Promise<Response>;
    }>();

    type checkGet = Expect<
      Equal<
        typeof get,
        TW.Action<
          "HttpClient::get",
          (url: string) => Promise<Response>,
          { trait: true }
        >
      >
    >;
    type checkPost = Expect<
      Equal<
        typeof post,
        TW.Action<
          "HttpClient::post",
          (url: string, body: unknown) => Promise<Response>,
          { trait: true }
        >
      >
    >;
  });

  test("type — two distinct traits are independently typed", () => {
    const { Logger } = Trait("Logger");
    const { Storage } = Trait("Storage");

    const { log } = Logger<{ log: (msg: string) => void }>();
    const { read } = Storage<{ read: (key: string) => string }>();

    type checkLog = Expect<
      Equal<
        typeof log,
        TW.Action<"Logger::log", (msg: string) => Promise<void>, { trait: true }>
      >
    >;
    type checkRead = Expect<
      Equal<
        typeof read,
        TW.Action<
          "Storage::read",
          (key: string) => Promise<string>,
          { trait: true }
        >
      >
    >;
  });

  test("type — PascalCase enforced: lowercase name is a type error", () => {
    // @ts-expect-error — lowercase names are rejected
    Trait("logger");

    // @ts-expect-error — names with separators are rejected
    Trait("my-logger");
  });
});
