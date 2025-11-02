import { TaskWish } from "./types";

interface App<Name extends string>
  extends TaskWish.Typed<"app">,
    TaskWish.Named<Name> {}

export const App = <const Name extends string>(name: string): App<Name> => {
  return {} as never;
};
