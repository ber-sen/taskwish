import {
  Apply,
  ValidateTrigger,
  InferTriggerScope,
  Pretty,
  CamelCase,
} from "../helpers";
import { Steps } from "../steps";
import { TW } from "../core";

type ActionBody<
  Name extends string,
  Ctx extends Record<any, any>,
> = TW.Contextual<Ctx> & {
  use<const NewScope>(newScope: NewScope): ActionBody<Name, Ctx>;
  run: Steps<Ctx>;
};

type SignatureBody<
  Name extends string,
  Ctx extends Record<any, any>,
  Signature,
> = {
  use<const NewScope>(newScope: NewScope): SignatureBody<Name, Ctx, Signature>;
  run<
    const Handler extends (
      this: TW.Scope<
        Pretty<
          Record<
            "input",
            Signature extends (...args: any) => any
              ? Parameters<Signature>
              : Signature extends TW.Handler
                ? Parameters<Apply<Signature, Ctx>>
                : never
          > &
            Ctx["scope"]
        >
      >,
    ) => Signature extends (...args: any) => any
      ? ReturnType<Signature>
      : Signature extends TW.Handler
        ? ReturnType<Apply<Signature, Ctx>>
        : never,
  >(
    run: Handler,
  ): {
    [key in Name]: Signature extends (...args: any) => any
      ? TW.Action<Name, Signature>
      : Signature extends TW.Handler
        ? TW.Action<
            Name,
            Apply<Signature, Ctx>,
            Record<"handler", Signature>
          >
        : never;
  };
};

type StepName = string & {};

export interface ActionFactory<
  Name extends string,
  Ctx extends Record<any, any> = {
    name: Name;
    model: "gpt5";
    scope: {
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
            '@'?: string;
            channel: "#general";
            message: string;
          }) => string;
        };
      };
    };
  },
> {
  input<const Schema>(trigger?: ValidateTrigger<Schema>): Schema extends
    | ((...args: any) => any)
    | TW.Handler
    ? SignatureBody<Name, Ctx, Schema>
    : ActionBody<
        Name,
        {
          name: Ctx["name"];
          scope: InferTriggerScope<Schema> & Ctx["scope"];
          [TW.Step]: { name: "launchApp" | StepName; map: { launchApp: string } };
        }
      >;
  run: Steps<Ctx>;
}

export function Action<const Name extends string>(
  name: CamelCase<Name>,
): ActionFactory<Name> {
  return {} as never;
}
