import { Steps } from "./steps/steps";
import { TaskWish } from "./types";

interface ConfigurableUseCase<
  Scope extends Record<any, any>,
  Used extends "describe" | null = null,
> extends TaskWish.Scoped<Scope> {
  steps: Steps<Scope>;
  describe(
    description: string,
    meta?: { input: Scope["input"] },
  ): ConfigurableUseCase<Scope, Used & "describe">;
}

export interface UseCaseFactory<
  Params,
  Scope extends Record<any, any> = {},
  Used extends "describe" | null = null,
> extends TaskWish.Scoped<Scope>,
    TaskWish.Extendable<Scope>,
    TaskWish.Triggerable<Scope>,
    TaskWish.Describable<
      { input?: Scope["input"] },
      UseCaseFactory<Params, Scope, "describe">
    > {
  on<const Name extends string, const Schema>(
    trigger: TaskWish.ValidateTrigger<Name, Schema>,
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
  use<const NewScope>(
    newScope: NewScope,
  ): Used extends string
    ? Omit<UseCaseFactory<Params, NewScope & Scope, Used>, Used>
    : UseCaseFactory<Params, NewScope & Scope, Used>;
  steps: Steps<Scope>;
}

export const UseCase = <const Params extends string>(
  name: Params,
): UseCaseFactory<Params> => {
  return name as any;
};
