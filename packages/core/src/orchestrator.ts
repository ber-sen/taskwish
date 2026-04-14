import { Taskwish } from "./core";

export const Orchestrator: <Name extends string>(
  name: Name,
) => Taskwish.Named<Name> = {} as never;
