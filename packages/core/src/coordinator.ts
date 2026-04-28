import { TW } from "./core";

export const Coordinator: <Name extends string>(
  name: Name,
) => TW.Named<Name> = {} as never;
