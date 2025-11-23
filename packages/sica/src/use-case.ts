import { Steps } from "./steps/steps";
import { Sica } from "./types";

interface UseCaseMethodBody<Scope extends Record<any, any>>
  extends Sica.Scoped<Scope> {
  use<const NewScope>(newScope: NewScope): UseCaseMethodBody<NewScope & Scope>;
  steps: Steps<Scope>;
}

export interface UseCaseFactory<Params, Scope extends Record<any, any> = {}>
  extends Sica.Scoped<Scope>,
    UseCaseMethodBody<Scope>,
    Sica.Triggerable<Scope> {
  use<const NewScope>(
    newScope: NewScope
  ): UseCaseFactory<Params, NewScope & Scope>;
  on<const Schema>(
    trigger: Sica.ValidateTrigger<Schema>
  ): UseCaseMethodBody<Scope & Sica.InferTriggerScope<Schema>>;
}

export const UseCase = <const Params extends string>(
  name: Params
): UseCaseFactory<Params> => {
  return name as any;
};
