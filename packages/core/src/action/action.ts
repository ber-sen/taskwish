import {
  ToCamelCase,
  Apply,
  ValidateTrigger,
  InferTriggerScope,
  Pretty,
} from "../helpers";
import { Steps } from "../steps";
import { Taskwish } from "../types";

type ActionBody<
  Name extends string,
  Ctx extends Record<any, any>,
> = Taskwish.Contextual<Ctx> & {
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
      this: Taskwish.Scope<
        Pretty<
          Record<
            "input",
            Signature extends (...args: any) => Promise<any>
              ? Parameters<Signature>
              : Signature extends Taskwish.Handler
                ? Parameters<Apply<Signature, Ctx>>
                : never
          > &
            Ctx["scope"]
        >
      >,
    ) => Signature extends (...args: any) => Promise<any>
      ? ReturnType<Signature>
      : Signature extends Taskwish.Handler
        ? ReturnType<Apply<Signature, Ctx>>
        : never,
  >(
    run: Handler,
  ): {
    [key in ToCamelCase<Name>]: Signature extends (...args: any) => Promise<any>
      ? Taskwish.Action<Name, Signature>
      : Signature extends Taskwish.Handler
        ? Taskwish.Action<
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
    name: Name,
    scope: {
      run: {
        generateText: (params: { model: "gpt5"; prompt: string }) => string;
        slack: {
          sendMessage: (params: {
            channel: "#general";
            message: string;
          }) => string;
        };
      };
    };
  },
> {
  on<const Schema>(trigger: ValidateTrigger<Schema>): ActionBody<
    Name,
    {
      name: Ctx["name"];
      scope: InferTriggerScope<Schema> & Ctx["scope"];
      step: { name: "launchApp" | StepName; map: { launchApp: string } };
    }
  >;
  signature<
    const Signature extends ((...args: any) => Promise<any>) | Taskwish.Handler,
  >(): SignatureBody<Name, Ctx, Signature>;
  run: Steps<Ctx>;
}

export function Action<const Name extends string>(
  name: Name,
): ActionFactory<Name> {
  return {} as never;
}
