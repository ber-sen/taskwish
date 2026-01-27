import { PrettyScope } from "../helpers";
import { Taskwish } from "../types";
import { Steps } from "./steps";

export function Step<
  const Name extends string,
  Ctx extends Record<any, any>,
  Result,
>(
  name: Name,
  handler:
    | ((this: Taskwish.Scope<PrettyScope<Ctx["scope"]>>) => Result)
    | [(this: Taskwish.Scope<PrettyScope<Ctx["scope"]>>) => Result]
    | [
        (this: Taskwish.Scope<PrettyScope<Ctx["scope"]>>) => Result,
        { retry: number },
      ],
): {
  step: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, Result>;
    step: Ctx["step"];
    scope: Record<Name, Result> & Ctx["scope"];
    last: Result;
  };
};

export function Step<Ctx extends Record<any, any>>(
  name: Ctx["step"]["name"] extends string ? Ctx["step"]["name"] : never,
  params?: Ctx["step"]["params"],
): {
  step: (ctx: Ctx) => Ctx;
};

export function Step() {
  return {} as never;
}

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
  params: any,
): {
  step: (ctx: Ctx) => Name extends string
    ? {
        name: Ctx["name"];
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
        last: string;
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
  }),
);
