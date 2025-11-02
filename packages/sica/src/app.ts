import { Sica } from "./types";

interface App<Name extends string>
  extends Sica.Typed<"app">,
    Sica.Named<Name> {}

export const App = <const Name extends string>(name: string): App<Name> => {
  return {} as never;
};
