import { type ActionFactory } from "./action";
import { CamelCase, PascalCase, ValidateSchema } from "./helpers";
import { TW } from "./core";
interface Behavior<Ctx extends Record<any, any>> {
  on<Name extends string>(
    behavior: "Command",
    name: CamelCase<Name>,
  ): ActionFactory<
    Name,
    {
      name: Name;
      scope: Ctx["scope"];
    }
  >;

  on<
    Behavior extends
      | "Schedule"
      | "NewMention"
      | "NewMessage"
      | "NewEmail"
      | "Reaction"
      | "SubscribedMessage",
  >(
    behavior: Behavior,
  ): ActionFactory<
    `on${Behavior}`,
    {
      name: `on${Behavior}`;
      scope: Ctx["scope"];
    }
  >;
}

export const Actor = <
  const Name extends string,
  const Ctx extends Record<any, any> = {
    name: Name;
    model: "gpt5";
    scope: {
      signal: (type: string, event: any) => TW.Event<any, any>;
      thread: {
        sender: {
          name: string;
        };
        reply(msg: string): boolean;
      };
      actions: {
        generateText: (params: { model: "gpt5"; prompt: string }) => string;
        slack: {
          [key: `@${string}`]: {
            sendMessage: (params: {
              channel: "#general";
              message: string;
            }) => string;
          };
        } & {
          sendMessage: (params: {
            "@"?: string;
            channel: "#general";
            message: string;
          }) => string;
        };
      };
    };
  },
>(
  name: PascalCase<Name>,
): {
  use<A extends Record<any, any>>(step: {
    [TW.Step]: (input: Ctx) => A;
  }): {
    [key in Name]: () => Behavior<A>;
  };
  use<
    A,
    B extends Record<any, any>,
    A1 extends Record<string, { [TW.Name]: string }> | null = null,
  >(
    step1:
      | {
          [TW.Step]: (input: Ctx) => A;
        }
      | A1,
    step2: {
      [TW.Step]: (
        input: A1 extends undefined
          ? A
          : {
              name: Ctx["name"];
              steps: Ctx["steps"] & {
                [K in keyof A1]: A1[K];
              };
              scope: {
                [K in keyof A1]: A1[K];
              } & Ctx["scope"];
            },
      ) => B;
    },
  ): {
    [key in Name]: () => Behavior<B>;
  };
  use<A, B, C extends Record<any, any>>(
    step1: {
      [TW.Step]: (input: Ctx) => A;
    },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
  ): {
    [key in Name]: () => Behavior<C>;
  };
} & {
  [key in Name]: () => Behavior<Ctx>;
} => {
  return name as any;
};

export class TWActor<Name extends string> implements TW.Actor<Name> {
  public [TW.Name]: Name;

  constructor(name: Name) {
    this[TW.Name] = name;
  }
}
