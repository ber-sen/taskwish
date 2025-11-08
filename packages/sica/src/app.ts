import { Sica } from "./types";

interface App<Name extends string> extends Sica.Typed<["app"]> {}

export const App = <const Name extends string>(...name: any): App<Name> => {
  return {} as never;
};
