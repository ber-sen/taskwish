import { type ActionFactory } from "./action";
import {
  CamelCase,
  PascalCase,
  ToCapitalCase,
  ValidateSchema,
} from "./helpers";
import { TW } from "./core";
import { Name } from "drizzle-orm";
import { uuid } from "drizzle-orm/pg-core";
import { Steps } from "./steps";

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

export class TWActor<Name extends string> implements TW.Actor<Name> {
  [TW.Id]: `${string}-${string}-5${string}-${string}-${string}`;
  [TW.Name]: Name;
  constructor(name: Name) {
    this[TW.Name] = name;
    this[TW.Id] = 3 as never;
  }
  protected run: Steps<{}> = {} as never
}
