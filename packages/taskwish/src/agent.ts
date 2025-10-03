import { Type, type } from "arktype";
import { TaskWish } from "./types";

interface ConfigurableAgent<Scope extends Record<any, any>>
  extends TaskWish.Scoped<Scope> {
  skills(...skills: any): any;
}

export interface AgentFactory<Params, Scope extends Record<any, any> = {}>
  extends TaskWish.Scoped<Scope>,
    TaskWish.Extendable<Scope>,
    TaskWish.Triggerable<Scope>,
    ConfigurableAgent<Scope> {
  on<const Schema>(
    on: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableAgent<
    Scope & Record<"input", type.instantiate<Schema>["infer"]>
  >;
  use<const NewScope>(
    newScope: NewScope
  ): AgentFactory<Params, NewScope & Scope>;
}

export const Agent = <const Params extends string>(
  name: Params
): AgentFactory<Params> => {
  return name as any;
};
