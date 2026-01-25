import { ToCamelCase } from "../helpers";
import { Taskwish } from "../types";

interface ActionFactory<Name extends string> {
  handler<
    const Handler extends (this: Taskwish.Scope<{}>, ...args: any) => any,
  >(
    handler: Handler,
    composer?: (fn: Handler) => any,
  ): {
    [key in ToCamelCase<Name>]: Taskwish.Action<Name, Handler>;
  };
}

export function Action<
  const Name extends string,
  Handler extends (...args: any) => any,
>(name: Name): ActionFactory<Name>;

export function Action(...args: any) {
  return {} as any;
}
