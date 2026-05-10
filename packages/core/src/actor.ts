import { type ActionFactory } from "./action";
import { CamelCase, PascalCase, ValidateSchema } from "./helpers";
import { TW } from "./core";
interface Behavior {
  on<Name extends string>(
    behavior: "Command",
    name: CamelCase<Name>,
  ): ActionFactory<Name>;

  on<
    Behavior extends
      | "Schedule"
      | "NewMention"
      | "NewMessage"
      | "NewEmail"
      | "Reaction"
      | "SubscribedMessage",
  >(
    behavior: Behavior,
  ): ActionFactory<`on${Behavior}`>;
}

export const Actor = <const Name extends string>(
  name: PascalCase<Name>,
): {
  use: <const Defs extends Array<any>>(...args: Defs) => {
    [key in Name]: () => Behavior;
  };
} & {
  [key in Name]: () => Behavior;
} => {
  return name as any;
};

export class TWActor<Name extends string> implements TW.Actor<Name> {
  public [TW.Name]: Name;

  constructor(name: Name) {
    this[TW.Name] = name;
  }
}
