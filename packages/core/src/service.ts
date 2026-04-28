import { type ActionFactory } from "./action";
import { CamelCase, PascalCase, ValidateSchema } from "./helpers";
import { TW } from "./core";

interface Registry {
  action<Name extends string>(name: CamelCase<Name>): ActionFactory<Name>;
}

export const Service = {
  MCP<const Name extends string, const Env>(
    name: PascalCase<Name> | TW.Named<PascalCase<Name>>,
    env?: ValidateSchema<Env>,
  ): {
    [key in Name]: () => Registry;
  } {
    return name as any;
  },
};

export class TWService<Name extends string> implements TW.Service<Name> {
  public [TW.Name]: Name;

  constructor(name: Name) {
    this[TW.Name] = name;
  }
}
