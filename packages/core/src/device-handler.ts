import { Taskwish } from "./types";

export const DeviceHandler: <Name extends string>(
  name: Name,
) => Taskwish.Named<Name> = {} as never;
