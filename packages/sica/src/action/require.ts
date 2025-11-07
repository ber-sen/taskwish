import { Sica } from "../types";

export const Require = <const Name extends string>(name: Name) => ({
  type: <const Type>(type?: Type): Sica.Require<Name, Type> => ({
    [Sica.TYPE]: {} as Type,
    [Sica.NAME]: name,
  })
});
