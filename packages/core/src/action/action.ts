import {
  ToCamelCase,
  Apply,
  ValidateTrigger,
  InferTriggerScope,
  PrettyScope,
} from "../helpers";
import { Taskwish } from "../types";

type ActionMethod<
  Name extends string,
  Ctx extends Record<any, any>,
> = Taskwish.Contextual<Ctx> & {
  use<const NewScope>(newScope: NewScope): ActionMethod<Name, Ctx>;
  handler: <Input extends Ctx["input"], Output>(
    run: (this: PrettyScope<Ctx>) => Output,
  ) => {
    [key in ToCamelCase<Name>]: Taskwish.Action<
      Name,
      Input extends object
        ? (input: Input) => Promise<Awaited<Output>>
        : () => Promise<Awaited<Output>>
    >;
  } & ActionFactory<Name, Omit<Ctx, "input">>;
};

export interface ActionFactory<
  Name extends string,
  Scope extends Record<any, any> = { model: "gpt" },
> {
  on<const Schema>(
    trigger: ValidateTrigger<Schema>,
  ): ActionMethod<Name, Scope & InferTriggerScope<Schema>>;
  signature<
    const Signature extends ((...args: any) => Promise<any>) | Taskwish.Handler,
  >(): {
    handler<
      const Handler extends (
        this: Taskwish.Scope<Scope> &
          Record<
            "input",
            Signature extends (...args: any) => Promise<any>
              ? Parameters<Signature>
              : Signature extends Taskwish.Handler
                ? Parameters<Apply<Signature, Scope>>
                : never
          >,
      ) => Signature extends (...args: any) => Promise<any>
        ? ReturnType<Signature>
        : Signature extends Taskwish.Handler
          ? ReturnType<Apply<Signature, Scope>>
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
              Apply<Signature, Scope>,
              Record<"handler", Signature>
            >
          : never;
    };
  };
  handler: <Input extends Scope["input"], Output>(
    run: (this: PrettyScope<Scope>) => Output,
  ) => {
    [key in ToCamelCase<Name>]: Taskwish.Action<
      Name,
      Input extends object
        ? (input: Input) => Promise<Awaited<Output>>
        : () => Promise<Awaited<Output>>
    >;
  } & ActionFactory<Name, Omit<Scope, "input">>;
}

export function Action<
  const Name extends string,
  Handler extends (...args: any) => any,
>(name: Name): ActionFactory<Name>;

export function Action(...args: any) {
  return {} as any;
}
