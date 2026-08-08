import { GenerateText } from "@taskwish/ai";
import { Actor, ScopeResultKind, Step, Steps, TW, Trait } from "@taskwish/core";

export const Pipeline = {} as Steps<{}, ScopeResultKind>;

const SpeechToText: <
  const Name extends string,
  Ctx extends Record<string, any>,
>(
  name: Name,
  args: any,
) => {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
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
  name: Name,
  args: any,
) => {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    step: Ctx["step"];
    scope: Ctx["scope"] & Record<Name, { text: string }>;
    last: null;
    plugins: Ctx["plugins"];
  };
} = {} as never;

const VoiceCall = Trait({
  service: "VoiceCall",
  self: "voiceCall",
})<{
  voiceCall: (input: () => Generator<Uint8Array>) => void;
  onConnect: <Result>(input: { sessionId: string }) => Result;
}>();

const { assistant } = Actor("Assistant");

export const { onVoiceCallConnect } = assistant()
  .on(VoiceCall.Connect)

  .run(
    Step("log", function () {
      console.log(this.input);
    }),
  );

export const { voiceCall } = assistant()
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

export const { Assistant } = assistant().service({
  onVoiceCallConnect,
  voiceCall,
});

voiceCall(function* () {
  yield new Uint8Array([120, 240, -100, 50]);
});

// Step("log", function () {
//       console.log(this.transcript);
//       console.log(this.assistant);
//       console.log(this.speech);
//     }),
