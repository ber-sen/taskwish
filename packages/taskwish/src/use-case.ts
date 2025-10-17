import { Steps } from "./steps/steps";
import { TaskWish } from "./types";

interface ConfigurableUseCase<
  Scope extends Record<any, any>,
  Used extends "describe" | null = null
> extends TaskWish.Scoped<Scope> {
  steps: Steps<Scope>;
  describe(
    description: string,
    meta?: { input: Scope["input"] }
  ): ConfigurableUseCase<Scope, Used & "describe">;
}

export interface UseCaseFactory<
  Params,
  Scope extends Record<any, any> = {},
  Used extends "describe" | null = null
> extends TaskWish.Scoped<Scope>,
    TaskWish.Extendable<Scope>,
    TaskWish.Triggerable<Scope>,
    TaskWish.Describable<Scope> {
  trigger<const Schema>(
    input: TaskWish.ValidateSchema<Schema>
  ): Used extends string
    ? Omit<
        ConfigurableUseCase<
          Scope & Record<"input", TaskWish.InferInput<Schema>>,
          Used
        >,
        Used
      >
    : ConfigurableUseCase<
        Scope & Record<"input", TaskWish.InferInput<Schema>>,
        Used
      >;
  trigger<const Type extends string, const Input extends object>(
    event: TaskWish.Event<Type, Input>
  ): ConfigurableUseCase<
    Scope &
      Record<"input", Input> &
      Record<"event", ReturnType<TaskWish.Event<Type, Input>>>,
    Used
  >;

  use<const NewScope>(
    newScope: NewScope
  ): Used extends string
    ? Omit<UseCaseFactory<Params, NewScope & Scope, Used>, Used>
    : UseCaseFactory<Params, NewScope & Scope, Used>;
  describe(
    description: string,
    meta?: { input: Scope["input"] }
  ): Omit<UseCaseFactory<Params, Scope, "describe">, "describe">;
  steps: Steps<Scope>;
}

export const UseCase = <const Params extends string>(
  name: Params
): UseCaseFactory<Params> => {
  return name as any;
};
