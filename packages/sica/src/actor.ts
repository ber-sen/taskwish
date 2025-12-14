import { Steps } from "./steps/steps";
import { Sica } from "./types";

interface ActorMethod<Scope extends Record<any, any>>
  extends Sica.Scoped<Scope> {
  use<const NewScope>(newScope: NewScope): ActorMethod<Scope>;
  steps: Steps<Scope>;
}

export interface ActorFactory<Params, Scope extends Record<any, any> = {}>
  extends Sica.Scoped<Scope>,
    ActorMethod<Scope>,
    Sica.Triggerable<Scope> {
  use<const NewScope>(newScope: NewScope): ActorFactory<Params, Scope>;
  on<const Schema>(
    trigger: Sica.ValidateTrigger<Schema>
  ): ActorMethod<Scope & Sica.InferTriggerScope<Schema>>;
}

export const Actor = <const Params extends string>(
  name: Params
): ActorFactory<Params> => {
  return name as any;
};

// const ActorNew = <Obj extends { main: () => any }>(
//   obj: Obj
// ): Sica.Actor<Obj> => {
//   return {} as never;
// };

// const a = ActorNew({ main: () => 3 });
