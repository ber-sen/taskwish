import { Steps } from "./steps/steps";
import { TaskWish } from "./types";

export interface AgentFactory<
  Params,
  Scope extends Record<any, any> = {},
  Used extends "describe" | null = null,
> extends TaskWish.Scoped<Scope>,
    TaskWish.Extendable<Scope>,
    TaskWish.Describable<
      { input?: Scope["input"] },
      AgentFactory<Params, Scope, "describe">
    > {
  use<const NewScope>(
    newScope: NewScope,
  ): Used extends string
    ? Omit<AgentFactory<Params, NewScope & Scope, Used>, Used>
    : AgentFactory<Params, NewScope & Scope, Used>;
  abilities: Steps<Scope>;
  controller(usecase: (event: TaskWish.Event<any, any>) => void): void;
}

export const Agent = <const Params extends string>(
  name: Params,
): AgentFactory<Params> => {
  return name as any;
};
