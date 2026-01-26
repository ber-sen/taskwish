import { InferTriggerScope, ToCamelCase, ValidateTrigger } from "./helpers";
import { Taskwish } from "./types";

type ActorMethod<
  Name extends string,
  Scope extends Record<any, any>,
> = Taskwish.Scoped<Scope> & {
  use<const NewScope>(newScope: NewScope): ActorMethod<Name, Scope>;
  handler: <Input extends Scope["input"], Output>(
    handler: (this: Input) => Output,
  ) => {
    [key in ToCamelCase<Name>]: Input extends object
      ? Taskwish.Action<Name, (input: Input) => Promise<Awaited<Output>>>
      : Taskwish.Action<Name, () => Promise<Awaited<Output>>>;
  };
};

interface DummyScope {
  step: {
    name: "launchApp" | "scrollUntilVisible" | "tapOn" | "scroll";
    params: object | boolean | number | string;
    result: string;
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

export interface ActorFactory<
  Name extends string,
  Scope extends Record<any, any> = {},
> extends Taskwish.Scoped<Scope>,
    ActorMethod<Name, Scope>,
    Taskwish.Triggerable<Scope> {
  use<const NewScope>(newScope: NewScope): ActorFactory<Name, Scope>;
  on<const Schema>(
    trigger: ValidateTrigger<Schema>,
  ): ActorMethod<Name, Scope & InferTriggerScope<Schema>>;
}

export const Actor = <const Name extends string>(
  name: Name,
): ActorFactory<Name> => {
  return name as any;
};

// const ActorNew = <Obj extends { main: () => any }>(
//   obj: Obj
// ): Taskwish.Actor<Obj> => {
//   return {} as never;
// };

// const a = ActorNew({ main: () => 3 });
