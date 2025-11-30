import { Sica } from "./types";

export function Flow<Type extends string>(type: Type) {
  return {
    params: <Params>(params: Params): Sica.Flow<[Type], Params, null> => ({
      [Sica.Type]: [type],
      group: null,
      params,
    }),
  };
}
