import { type ActionFactory } from "./action";
import {
  CamelCase,
  PascalCase,
  ToCapitalCase,
  ValidateSchema,
} from "./helpers";
import { Taskwish } from "./types";

interface Behavior {
  action<Name extends string>(name: CamelCase<Name>): ActionFactory<Name>;
  on<Name extends string>(
    behavior: "Command",
    name: CamelCase<Name>,
  ): ActionFactory<Name>;

  on<
    Behavior extends
      | "Schedule"
      | "NewMention"
      | "NewMessage"
      | "Reaction"
      | "SubscribedMessage",
  >(
    behavior: Behavior,
  ): ActionFactory<`on${Behavior}`>;
}

export const Actor = <const Name extends string, const Env>(
  name: PascalCase<Name> | Taskwish.Named<PascalCase<Name>>,
  env?: ValidateSchema<Env>,
): {
  [key in ToCapitalCase<Name>]: () => Behavior;
} => {
  return name as any;
};
