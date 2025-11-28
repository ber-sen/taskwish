import { Sica } from "../types";

export const End = (
  params: (...params: any) => Sica.Flow<any>
): Sica.Flow<["end"]> => ({
  [Sica.Type]: ["end"],
  group: null,
});
