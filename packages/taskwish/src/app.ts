import { TaskWish } from "./types";

interface AppFactory<Name extends string> extends TaskWish.Typed<Name> {
  config(): TaskWish.App<{}>;
}

export const App = <const Name extends string>(
  name: string,
): AppFactory<Name> => {
  return {} as never;
};
