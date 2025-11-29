import { Sica } from "./types";

export function Flow<
  Type extends string[],
  Scope = {},
  Group extends null | string[] = null,
>(options: {
  type: Type;
  group: Group;
  scope: Scope;
}): Sica.Flow<Type, Scope, Group> {
  return {
    [Sica.Type]: options.type,
    group: options.group,
    scope: options.scope,
  };
}
