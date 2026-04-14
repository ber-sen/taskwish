import { type ActionFactory } from "./action";
import {
  CamelCase,
  PascalCase,
  ToCapitalCase,
  ValidateSchema,
} from "./helpers";
import { TW } from "./core";

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
  name: PascalCase<Name> | TW.Named<PascalCase<Name>>,
  env?: ValidateSchema<Env>,
): {
  [key in Name]: () => Behavior;
} => {
  return name as any;
};
