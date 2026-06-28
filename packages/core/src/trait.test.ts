import { describe, expect, test } from "bun:test";
import { Expect, Equal } from "./helpers";
import { TW } from "./core";
import { Trait } from "./trait";

describe("Trait", () => {
  test("returns an object directly", () => {
    const instance = Trait<{ log: () => string }>();

    expect(typeof instance).toBe("object");
  });

  test("each method is tagged with TW.Name as a trait action", () => {
    const { log } = Trait<{ log: () => string }>();

    expect((log as any)[TW.Name]).toBe("::log");
  });

  test("method names follow action snake-case naming", () => {
    const { postMessage } = Trait<{ postMessage: () => string }>();

    expect((postMessage as any)[TW.Name]).toBe("::post_message");
  });

  test("each method carries null TW.Meta at runtime", () => {
    const { log } = Trait<{ log: () => string }>();

    expect((log as any)[TW.Meta]).toBeNull();
  });

  test("type — single method is wrapped in TW.Action as a trait action", () => {
    const Logger = Trait<{ log: () => string }>();

    type check = Expect<
      Equal<
        typeof Logger,
        {
          log: TW.Action<"::log", () => Promise<string>, null>;
        }
      >
    >;
  });

  test("type — already-Promise return is not double-wrapped", () => {
    const Cache = Trait<{ get: (key: string) => Promise<string> }>();

    type check = Expect<
      Equal<
        typeof Cache,
        {
          get: TW.Action<"::get", (key: string) => Promise<string>, null>;
        }
      >
    >;
  });

  test("type — multi-method shape uses trait action names for each method", () => {
    const HttpClient = Trait<{
      get: (url: string) => Promise<Response>;
      post: (url: string, body: unknown) => Promise<Response>;
    }>();

    type check = Expect<
      Equal<
        typeof HttpClient,
        {
          get: TW.Action<
            "::get",
            (url: string) => Promise<Response>,
            null
          >;
          post: TW.Action<
            "::post",
            (url: string, body: unknown) => Promise<Response>,
            null
          >;
        }
      >
    >;
  });

  test("type — existing TW.Action handler and meta are preserved", () => {
    const Logger = Trait<{
      log: TW.Action<"log", () => Promise<string>, { service: "logger" }>;
    }>();

    type check = Expect<
      Equal<
        typeof Logger,
        {
          log: TW.Action<
            "::log",
            () => Promise<string>,
            { service: "logger" }
          >;
        }
      >
    >;
  });
});
