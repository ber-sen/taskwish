import { describe, expect, test } from "bun:test";
import { Expect, Equal } from "./helpers";
import { TW } from "./core";
import { Trait } from "./trait";

describe("Trait", () => {
  test("returns a non-callable trait proxy directly", () => {
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

  test("event methods are exposed by event name and carry event metadata", () => {
    const VoiceCall = Trait<{
      onVoiceCall: (
        chunk: ArrayBuffer,
      ) => Generator<ArrayBuffer, null, unknown>;
    }>();

    expect((VoiceCall.VoiceCall as any)[TW.Name]).toBe("::VoiceCall");
    expect((VoiceCall.VoiceCall as any)[TW.Meta]).toEqual({
      event: "::VoiceCall",
    });
  });

  test("options — service prefixes event names and self exposes the default event", () => {
    const VoiceCall = Trait({
      service: "VoiceCall",
      self: "onStream",
    })<{
      onStream: (input: {
        sessionId: string;
        chunk: ArrayBuffer;
      }) => Generator<ArrayBuffer, null, unknown>;
      onConnect: <Result>(input: { sessionId: string }) => Result;
    }>();

    expect((VoiceCall as any)[TW.Name]).toBe("::VoiceCallStream");
    expect((VoiceCall as any)[TW.Meta]).toEqual({
      event: "::VoiceCallStream",
    });
    expect((VoiceCall.Stream as any)[TW.Name]).toBe("::VoiceCallStream");
    expect((VoiceCall.Stream as any)[TW.Meta]).toEqual({
      event: "::VoiceCallStream",
    });
    expect((VoiceCall.Connect as any)[TW.Name]).toBe("::VoiceCallConnect");
    expect((VoiceCall.Connect as any)[TW.Meta]).toEqual({
      event: "::VoiceCallConnect",
    });
  });

  test("type — single method is wrapped in TW.Action as a trait action", () => {
    const Logger = Trait<{ log: () => string }>();

    type check = Expect<
      Equal<typeof Logger.log, TW.Action<"::log", () => Promise<string>, null>>
    >;
  });

  test("type — plain trait is not an options builder", () => {
    const Logger = Trait<{ log: () => string }>();

    type check = Expect<Equal<typeof Logger, Trait<{ log: () => string }>>>;

    if (false) {
      // @ts-expect-error options are only accepted by Trait(options)<T>()
      Logger({ service: "Logger" });
    }
  });

  test("type — already-Promise return is not double-wrapped", () => {
    const Cache = Trait<{ get: (key: string) => Promise<string> }>();

    type check = Expect<
      Equal<
        typeof Cache.get,
        TW.Action<"::get", (key: string) => Promise<string>, null>
      >
    >;
  });

  test("type — multi-method shape uses trait action names for each method", () => {
    const HttpClient = Trait<{
      get: (url: string) => Promise<Response>;
      post: (url: string, body: unknown) => Promise<Response>;
    }>();

    type checkGet = Expect<
      Equal<
        typeof HttpClient.get,
        TW.Action<"::get", (url: string) => Promise<Response>, null>
      >
    >;
    type checkPost = Expect<
      Equal<
        typeof HttpClient.post,
        TW.Action<
          "::post",
          (url: string, body: unknown) => Promise<Response>,
          null
        >
      >
    >;
  });

  test("type — event method is exposed as event action with event metadata", () => {
    const VoiceCall = Trait<{
      onVoiceCall: (
        chunk: ArrayBuffer,
      ) => Generator<ArrayBuffer, null, unknown>;
    }>();

    type check = Expect<
      Equal<
        typeof VoiceCall.VoiceCall,
        TW.Action<
          "::VoiceCall",
          (chunk: ArrayBuffer) => Generator<ArrayBuffer, null, unknown>,
          { event: "::VoiceCall" }
        >
      >
    >;
  });

  test("type — options expose service events and self as the default action", () => {
    const VoiceCall = Trait({
      service: "VoiceCall",
      self: "onStream",
    })<{
      onStream: (input: {
        sessionId: string;
        chunk: ArrayBuffer;
      }) => Generator<ArrayBuffer, null, unknown>;
      onConnect: <Result>(input: { sessionId: string }) => Result;
    }>();

    type checkSelf = Expect<
      Equal<
        typeof VoiceCall,
        TW.Action<
          "::VoiceCallStream",
          (input: {
            sessionId: string;
            chunk: ArrayBuffer;
          }) => Generator<ArrayBuffer, null, unknown>,
          { event: "::VoiceCallStream" }
        > & {
          Stream: TW.Action<
            "::VoiceCallStream",
            (input: {
              sessionId: string;
              chunk: ArrayBuffer;
            }) => Generator<ArrayBuffer, null, unknown>,
            { event: "::VoiceCallStream" }
          >;
          Connect: TW.Action<
            "::VoiceCallConnect",
            <Result>(input: { sessionId: string }) => Result,
            { event: "::VoiceCallConnect" }
          >;
        }
      >
    >;
    type checkConnect = Expect<
      Equal<
        typeof VoiceCall.Connect,
        TW.Action<
          "::VoiceCallConnect",
          <Result>(input: { sessionId: string }) => Result,
          { event: "::VoiceCallConnect" }
        >
      >
    >;
  });

  test("type — existing TW.Action handler and meta are preserved", () => {
    const Logger = Trait<{
      log: TW.Action<"::log", () => Promise<string>>;
    }>();

    type check = Expect<
      Equal<typeof Logger.log, TW.Action<"::log", () => Promise<string>>>
    >;
  });
});
