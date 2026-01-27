import {
  ToCamelCase,
  Apply,
  ValidateTrigger,
  InferTriggerScope,
  PrettyScope,
} from "../helpers";
import { Steps } from "../steps";
import { Taskwish } from "../types";

type ActionMethod<
  Name extends string,
  Ctx extends Record<any, any>,
> = Taskwish.Contextual<Ctx> & {
  use<const NewScope>(newScope: NewScope): ActionMethod<Name, Ctx>;
  handler: Steps<Ctx>;
};

export interface ActionFactory<
  Name extends string,
  Ctx extends Record<any, any> = { model: "gpt"; name: Name },
> {
  on<const Schema>(
    trigger: ValidateTrigger<Schema>,
  ): ActionMethod<
    Name,
    { name: Ctx["name"]; scope: InferTriggerScope<Schema> }
  >;
  signature<
    const Signature extends ((...args: any) => Promise<any>) | Taskwish.Handler,
  >(): {
    handler<
      const Handler extends (
        this: Taskwish.Scope<Ctx> &
          Record<
            "input",
            Signature extends (...args: any) => Promise<any>
              ? Parameters<Signature>
              : Signature extends Taskwish.Handler
                ? Parameters<Apply<Signature, Ctx>>
                : never
          >,
      ) => Signature extends (...args: any) => Promise<any>
        ? ReturnType<Signature>
        : Signature extends Taskwish.Handler
          ? ReturnType<Apply<Signature, Ctx>>
          : never,
    >(
      run: Handler,
    ): {
      [key in ToCamelCase<Name>]: Signature extends (
        ...args: any
      ) => Promise<any>
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
  handler: Steps<Ctx>;
}

export function Action<
  const Name extends string,
  Handler extends (...args: any) => any,
>(name: Name): ActionFactory<Name>;

export function Action(...args: any) {
  return {} as any;
}
