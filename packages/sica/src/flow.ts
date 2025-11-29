import { Sica } from "./types";

export function Flow<Type extends string>(type: Type) {
  return {
    scope: <Scope>(scope: Scope) => ({
      [Sica.Type]: [type],
      group: null,
      scope,
    }),
  };
}
