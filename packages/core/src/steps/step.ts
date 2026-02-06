import { PrettyScope } from "../helpers";
import { Taskwish } from "../types";
import { Steps } from "./steps";

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: Taskwish.Scope<PrettyScope<Ctx["scope"]>>) => any,
  const Params extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : never,
>(
  name: Name,
  handler: Name extends keyof Ctx["step"]["map"] ? Params : Handler,
): {
  step: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] &
      Record<
        Name,
        Name extends keyof Ctx["step"]["map"] ? string : ReturnType<Handler>
      >;
    step: Ctx["step"];
    scope: Record<
      Name,
      Name extends keyof Ctx["step"]["map"] ? string : ReturnType<Handler>
    > &
      Ctx["scope"];
    last: Name;
  };
};

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: Taskwish.Scope<PrettyScope<Ctx["scope"]>>) => any,
  const Params extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : never,
  A,
>(
  name: Name,
  handler: [
    Name extends keyof Ctx["step"]["map"] ? Params : Handler,
    (
      res: Name extends keyof Ctx["step"]["map"] ? string : ReturnType<Handler>,
    ) => A,
  ],
): {
  step: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, A>;
    step: Ctx["step"];
    scope: Record<Name, A> & Ctx["scope"];
    last: Name;
  };
};

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: Taskwish.Scope<PrettyScope<Ctx["scope"]>>) => any,
  const Params extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : never,
  A,
  B
>(
  name: Name,
  handler: [
    Name extends keyof Ctx["step"]["map"] ? Params : Handler,
    (
      res: Name extends keyof Ctx["step"]["map"] ? string : ReturnType<Handler>,
    ) => A,
    (input: A) => B
  ],
): {
  step: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, B>;
    step: Ctx["step"];
    scope: Record<Name, B> & Ctx["scope"];
    last: Name;
  };
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
    return this.run.Slack.sendMessage({
      channel: "#general",
      message: this.generateText,
    });
  }),
);
