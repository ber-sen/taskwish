import { Steps } from "./steps/steps";
import { Sica } from "./types";

interface ConfigurableUseCase<
  Scope extends Record<any, any>,
  Used extends "describe" | null = null,
> extends Sica.Scoped<Scope> {
  steps: Steps<Scope>;
  describe(
    description: string,
    meta?: { input: Scope["input"] }
  ): ConfigurableUseCase<Scope, Used & "describe">;
}

export interface UseCaseFactory<
  Params,
  Scope extends Record<any, any> = {},
  Used extends "describe" | null = null,
> extends Sica.Scoped<Scope>,
    Sica.Triggerable<Scope> {
  on<const Schema>(
    trigger: Sica.ValidateTrigger<Schema>
  ): Used extends string
    ? Omit<ConfigurableUseCase< Sica.InferTrigger<Schema>, Used>, Used>
    : ConfigurableUseCase<Sica.InferTrigger<Schema>, Used>;
  use<const NewScope>(
    newScope: NewScope
  ): Used extends string
    ? Omit<UseCaseFactory<Params, NewScope & Scope, Used>, Used>
    : UseCaseFactory<Params, NewScope & Scope, Used>;
  steps: Steps<Scope>;
}

export const UseCase = <const Params extends string>(
  name: Params
): UseCaseFactory<Params> => {
  return name as any;
};
