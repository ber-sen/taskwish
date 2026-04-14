import { TW } from "./core";

export const Orchestrator: <Name extends string>(
  name: Name,
) => TW.Named<Name> = {} as never;
