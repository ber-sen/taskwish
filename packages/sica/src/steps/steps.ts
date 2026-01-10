import { PrettyScope } from "../helpers";

const Last = Symbol.for("Last");

export type StepsReturn<Scope> = typeof Last extends keyof Scope
  ? Scope[typeof Last]
  : Scope;

export interface Steps<Scope extends Record<any, any>> {
  <A>(
    step: { step: (input: Scope) => A } | ((this: Scope) => A)
  ): StepsReturn<A>;
  <A, B>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B }
  ): StepsReturn<B>;
  <A, B, C>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C }
  ): StepsReturn<C>;
  <A, B, C, D>(
    step1: { step: (input: Scope) => A },
    step2: { step: (input: A) => B },
    step3: { step: (input: B) => C },
    step4: { step: (input: C) => D }
  ): StepsReturn<D>;
}

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

interface Scope {
  ai: {
    generateText: (params: { model: "gpt5"; prompt: string }) => string;
  };
  action: {
    slack: {
      sendMessage: (params: { channel: "#general"; message: string }) => string;
    };
  };
}

export const Steps: Steps<Scope> = () => {
  return {} as never;
};

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
