import { GenerateText } from "../../../ai/src";
import { Actor, Event, Steps, DefResultKind, TW } from "../../src";

const Pipeline: Steps<{}, DefResultKind> = {} as never;

const SpeechToText: <
  const Name extends string,
  Ctx extends Record<string, any>,
>(
  name: Name,
  args: any,
) => {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["step"];
    step: Ctx["step"];
    scope: Ctx["scope"] & Record<Name, { text: string }>;
    last: null;
    plugins: Ctx["plugins"];
  };
} = {} as never;

const TextToSpeech: <
  const Name extends string,
  Ctx extends Record<string, any>,
>(
  ...args: any
) => {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["step"];
    step: Ctx["step"];
    scope: Ctx["scope"] & Record<Name, { text: string }>;
    last: null;
    plugins: Ctx["plugins"];
  };
} = {} as never;

const { VoiceCall: VoiceCallChunk } = Event("VoiceCall", {
  frame: "string",
});

const VoiceCall = Object.assign(VoiceCallChunk, {
  Connect: Event("VoiceCall::Connect", {
    frame: "string",
  })["VoiceCall::Connect"],
});

export const { Assistant } = Actor("Assistant");

export const { onVoiceCall } = Assistant()
  .on(VoiceCall)

  .run(
    Pipeline(
      SpeechToText("transcript", {
        model: "sadasd",
      }),
      GenerateText("answer", {
        model: "sadasd",
      }),
      TextToSpeech("speech", {
        model: "sadasd",
      }),
    ),
  );

// Step("log", function () {
//       console.log(this.transcript);
//       console.log(this.assistant);
//       console.log(this.speech);
//     }),
