import { PrettyScope } from "../helpers";
import { Last, Steps } from "./steps";

export function Step<
  const Name extends string,
  Result,
  Ctx extends Record<any, any>,
>(
  name: Name,
  handler:
    | ((this: PrettyScope<Ctx["scope"]>) => Result)
    | [(this: PrettyScope<Ctx["scope"]>) => Result]
    | [(this: PrettyScope<Ctx["scope"]>) => Result, { retry: number }]
): {
  step: (ctx: Ctx) => Name extends string
    ? {
        steps: Ctx["steps"] &
          Record<
            Name,
            "if" extends keyof Ctx["scope"] ? Result | undefined : Result
          >;
        scope: Record<
          Name,
          "if" extends keyof Ctx["scope"] ? Result | undefined : Result
        > &
          Ctx["scope"];
        [Last]: Result;
      }
    : Ctx;
};

export function Step(...args: any) {
  return {} as never;
}

// example

const a = Steps(
  Step("get prompt", function () {
    return "asdad";
  }),

  Step("generate text", [
    function () {
      return this.ai.generateText({ model: "gpt5", prompt: this.getPrompt });
    },
    { retry: 3 },
  ]),

  Step("send message", function () {
    return this.action.slack.sendMessage({
      channel: "#general",
      message: this.generateText,
    });
  })
);
