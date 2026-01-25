import { ToCamelCase } from "../helpers";
import { Taskwish } from "../types";

interface ActionFactory<Name extends string> {
  make<const Handler extends (...args: any) => Promise<any>>(
    handler: (scope: Taskwish.Scope<{}>) => Handler,
  ): {
    [key in ToCamelCase<Name>]: Taskwish.Action<Name, Handler>;
  };
  handler<const Handler extends (...args: any) => Promise<any>>(
    handler: Handler,
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
