import { Type, type } from "arktype";
import { Scoped, Triggerable, Extendable } from "./types";
import { Steps } from "./steps";

interface ConfigurableUseCase<
  Scope extends Record<any, any>,
  Used extends string = ""
> extends Scoped<Scope> {
  steps: Steps<Scope>;
}

export interface UseCaseFactory<Params, Scope extends Record<any, any> = {}>
  extends Scoped<Scope>,
    Extendable<Scope>,
    Triggerable<Scope>,
    ConfigurableUseCase<Scope> {
  on<const Schema>(
    on: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableUseCase<
    Scope & Record<"input", type.instantiate<Schema>["infer"]>
  >;
  use<const NewScope>(
    newScope: NewScope
  ): UseCaseFactory<Params, NewScope & Scope>;
}

export const UseCase = <const Params extends string>(
  name: Params
): UseCaseFactory<Params> => {
  return name as any;
};
