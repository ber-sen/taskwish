import { type } from "arktype";
import { Steps } from "./steps/steps";
import { StandardSchemaV1 } from "@standard-schema/spec";
import { TaskWish } from "./types";

interface ConfigurableUseCase<
  Scope extends Record<any, any>,
  Used extends "describe" | null = null
> extends TaskWish.Scoped<Scope> {
  steps: Steps<Scope>;
  describe(
    description: string,
    meta?: { input: Scope["input"] }
  ): ConfigurableUseCase<Scope, Used & "describe">;
}

export interface UseCaseFactory<
  Params,
  Scope extends Record<any, any> = {},
  Used extends "describe" | null = null
> extends TaskWish.Scoped<Scope>,
    TaskWish.Extendable<Scope>,
    TaskWish.Triggerable<Scope>,
    TaskWish.Describable<Scope> {
  trigger<const Type extends string, const Input extends object>(
    event: TaskWish.Event<Type, Input>
  ): ConfigurableUseCase<
    Scope &
      Record<"input", Input> &
      Record<"event", TaskWish.Event<Type, Input>>,
    Used
  >;
  trigger<const Schema>(
    input: Schema extends StandardSchemaV1<infer Schema>
      ? StandardSchemaV1<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): Used extends string
    ? Omit<
        ConfigurableUseCase<
          Scope &
            Record<
              "input",
              Schema extends StandardSchemaV1<infer Schema>
                ? Schema
                : type.instantiate<Schema>["infer"]
            >,
          Used
        >,
        Used
      >
    : ConfigurableUseCase<
        Scope &
          Record<
            "input",
            Schema extends StandardSchemaV1<infer Schema>
              ? Schema
              : type.instantiate<Schema>["infer"]
          >,
        Used
      >;
  use<const NewScope>(
    newScope: NewScope
  ): Used extends string
    ? Omit<UseCaseFactory<Params, NewScope & Scope, Used>, Used>
    : UseCaseFactory<Params, NewScope & Scope, Used>;
  describe(
    description: string,
    meta?: { input: Scope["input"] }
  ): Omit<UseCaseFactory<Params, Scope, "describe">, "describe">;
  steps: Steps<Scope>;
}

export const UseCase = <const Params extends string>(
  name: Params
): UseCaseFactory<Params> => {
  return name as any;
};
