import { InferTriggerScope, ValidateTrigger } from "./helpers";
import { Steps } from "./steps";
import { Sica } from "./types";

interface ActorMethod<Scope extends Record<any, any>>
  extends Sica.Scoped<Scope> {
  use<const NewScope>(newScope: NewScope): ActorMethod<Scope>;
  handler: Steps<{
    scope: Scope & DummyScope["scope"];
    step: DummyScope["step"];
  }>;
}

interface DummyScope {
  step: {
    name: "launchApp" | "scrollUntilVisible" | "tapOn" | "scroll";
    params: object | boolean | number | string
    result: string
  };
  scope: {
    ai: {
      generateText: (params: { model: "gpt5"; prompt: string }) => string;
    };
    action: {
      slack: {
        sendMessage: (params: {
          channel: "#general";
          message: string;
        }) => string;
      };
    };
  };
}

export interface ActorFactory<Params, Scope extends Record<any, any> = {}>
  extends Sica.Scoped<Scope>,
    ActorMethod<Scope>,
    Sica.Triggerable<Scope> {
  use<const NewScope>(newScope: NewScope): ActorFactory<Params, Scope>;
  on<const Schema>(
    trigger: ValidateTrigger<Schema>
  ): ActorMethod<Scope & InferTriggerScope<Schema>>;
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
