import { type ActionFactory } from "./action";
import { ToCapitalCase, ValidateSchema } from "./helpers";

interface Behavior {
  on<Name extends string>(behavior: "command", name: Name): ActionFactory<Name>;

  on<
    Behavior extends
      | "schedule"
      | "newMention"
      | "newMessage"
      | "reaction"
      | "subscribedMessage",
  >(
    behavior: Behavior,
  ): ActionFactory<`on${Behavior}`>;
}

export const Actor = <const Name extends string, const Env>(
  name: Name,
  env?: ValidateSchema<Env>,
): {
  [key in ToCapitalCase<Name>]: () => Behavior;
} => {
  return name as any;
};
