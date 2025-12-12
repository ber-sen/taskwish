import { Steps } from "./steps/steps";
import { Sica } from "./types";

interface UseCaseMethod<Scope extends Record<any, any>>
  extends Sica.Scoped<Scope> {
  use<const NewScope>(newScope: NewScope): UseCaseMethod<Scope>;
  steps: Steps<Scope>;
}

export interface UseCaseFactory<Params, Scope extends Record<any, any> = {}>
  extends Sica.Scoped<Scope>,
    UseCaseMethod<Scope>,
    Sica.Triggerable<Scope> {
  use<const NewScope>(newScope: NewScope): UseCaseFactory<Params, Scope>;
  on<const Schema>(
    trigger: Sica.ValidateTrigger<Schema>
  ): UseCaseMethod<Scope & Sica.InferTriggerScope<Schema>>;
}

export const UseCase = <const Params extends string>(
  name: Params
): UseCaseFactory<Params> => {
  return name as any;
};

const UseCaseNew = <Obj extends { main: () => any }>(
  obj: Obj
): Sica.UseCase<Obj> => {
  return {} as never;
};

const a = UseCaseNew({ main: () => 3 });
