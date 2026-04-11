import { Taskwish } from "./types";

export const Orchestrator: <Name extends string>(
  name: Name,
) => Taskwish.Named<Name> = {} as never;
