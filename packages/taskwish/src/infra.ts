import { Steps } from "./steps/steps";
import { TaskWish } from "./types";
import { Type, type } from "arktype";

interface ConfigurableInfra<Scope extends Record<any, any>>
  extends TaskWish.Scoped<Scope> {
  defs: Steps<Scope>;
}

export interface InfraFactory<Params, Scope extends Record<any, any> = {}>
  extends TaskWish.Scoped<Scope>,
    TaskWish.Extendable<Scope>,
    TaskWish.Triggerable<Scope>,
    ConfigurableInfra<Scope> {
  on<const Schema>(
    on: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableInfra<Scope & Record<"on", type.instantiate<Schema>["infer"]>>;
  use<const NewScope>(
    newScope: NewScope
  ): InfraFactory<Params, NewScope & Scope>;
}

export const Infra = <const Params extends string>(
  name: Params
): InfraFactory<Params> => {
  return name as any;
};
