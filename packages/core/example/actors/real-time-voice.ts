import { Agent } from "../../../ai/src";
import { Actor, Step, Event, Steps, DefResultKind, TW } from "../../src";

const Pipeline: Steps<{}, DefResultKind> = {} as never;

const SpeechToText: <Ctx extends Record<string, any>>(
  args: any,
) => {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["step"];
    [TW.Step]: Ctx["step"];
    scope: Ctx["scope"];
    last: null;
    plugins: Ctx["plugins"];
  };
} = {} as never;

const TextToSpeech: <Ctx extends Record<string, any>>(
  args: any,
) => {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["step"];
    [TW.Step]: Ctx["step"];
    scope: Ctx["scope"];
    last: null;
    plugins: Ctx["plugins"];
  };
} = {} as never;

const { VoiceCall } = Event("VoiceCall", {
  event: "'connect' | 'dissconect'",
});

export const { Assistant } = Actor("Assistant");

export const { onVoiceCall } = Assistant()
  .on(VoiceCall)

  .run(
    Pipeline(
      SpeechToText({
        model: "sadasd",
      }),
      Agent({
        instructions: "sadasd",
      }),
      TextToSpeech({
        model: "sadasd",
      }),
      Step("done", function () {
        return "done";
      }),
    ),
  );
