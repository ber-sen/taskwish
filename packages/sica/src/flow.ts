import { Sica } from "./types";

export function Flow<Type extends string>(type: Type) {
  return {
    params: <Params>(params: Params) => ({
      [Sica.Type]: [type],
      group: null,
      params,
    }),
  };
}
