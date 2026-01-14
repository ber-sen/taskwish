import { PrettyScope } from "../helpers";
import { Last, Steps } from "./steps";

export const Step = <
  const Name extends string,
  Result,
  Ctx extends Record<any, any>,
>(
  name: Name,
  handler:
    | ((this: PrettyScope<Ctx["scope"]>) => Result)
    | [(this: PrettyScope<Ctx["scope"]>) => Result]
    | [(this: PrettyScope<Ctx["scope"]>) => Result, { retry: number }]
) => {
  return {} as any as {
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
};

type ActionPaths<T, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? keyof T[K] extends never
      ? `${Prefix}${Extract<K, string>}`
      : ActionPaths<T[K], `${Prefix}${Extract<K, string>}.`>
    : never;
}[keyof T];

Step.Run = <const Name extends string, Ctx extends Record<any, any>>(
  action:
    | ActionPaths<Ctx["scope"]["action"]>
    | ActionPaths<Ctx["scope"]["ai"]>
    | [
        ActionPaths<Ctx["scope"]["action"]> | ActionPaths<Ctx["scope"]["ai"]>,
        Name,
      ],
  params: any
): {
  step: (ctx: Ctx) => Name extends string
    ? {
        steps: Ctx["steps"] &
          Record<
            Name,
            "if" extends keyof Ctx["scope"] ? string | undefined : string
          >;
        scope: Record<
          Name,
          "if" extends keyof Ctx["scope"] ? string | undefined : string
        > &
          Ctx["scope"];
        [Last]: string;
      }
    : Ctx;
} => {
  return {} as never;
};

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
