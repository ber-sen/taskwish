import { Steps } from "./steps/steps";
import { Sica } from "./types";

interface ConfigurableUseCase<
  Scope extends Record<any, any>,
  Used extends "describe" | null = null,
> extends Sica.Scoped<Scope> {
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
> extends Sica.Scoped<Scope>,
    Sica.Extendable<Scope>,
    Sica.Triggerable<Scope>,
    Sica.Describable<
      { input?: Scope["input"] },
      UseCaseFactory<Params, Scope, "describe">
    > {
  on<const Name extends string, const Schema>(
    trigger: Sica.ValidateTrigger<Name, Schema>,
  ): Used extends string
    ? Omit<
        ConfigurableUseCase<
          Scope & Record<"input", Sica.InferInput<Schema>>,
          Used
        >,
        Used
      >
    : ConfigurableUseCase<
        Scope & Record<"input", Sica.InferInput<Schema>>,
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
