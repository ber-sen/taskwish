import { Agent } from "../../../ai/src";
import { Actor, Step, Event, Steps, DefResultKind, TW } from "../../src";

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

const { VoiceCall } = Event("VoiceCall", {
  state: "'connect' | 'dissconect'",
});

export const { Assistant } = Actor("Assistant");

export const { onVoiceCall } = Assistant()
  .on(VoiceCall)

  .run(
    Pipeline(
      SpeechToText("transcript", {
        model: "sadasd",
      }),
      Agent("assistant", {
        instructions: "sadasd",
      }),
      TextToSpeech("speech", {
        model: "sadasd",
      }),
      Step("log", function () {
        console.log(this.transcript);
        console.log(this.assistant);
        console.log(this.speech);
      }),
    ),
  );
