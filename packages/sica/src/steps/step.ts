import { PrettyScope } from "../helpers";
import { Last, Steps } from "./steps";

export function Step<
  const Name extends string,
  Result,
  Scope extends Record<any, any>,
>(
  name: Name,
  handler:
    | ((this: PrettyScope<Scope>) => Result)
    | [(this: PrettyScope<Scope>) => Result]
    | [(this: PrettyScope<Scope>) => Result, { retry: number }]
): {
  step: (
    scope: Scope
  ) => Name extends string
    ? Record<Name, Result> &
        Record<typeof Last, Result> &
        Omit<Scope, typeof Last>
    : Scope;
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
