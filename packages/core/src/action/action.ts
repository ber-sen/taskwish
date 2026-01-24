import { Taskwish } from "../types";

interface ActionFactory<Type extends string[] | string> {
  handler<const Handler extends (this: Taskwish.Scope<{}>, ...args: any) => any>(
    handler: Handler,
    composer?: (fn: Handler) => any
  ): Parameters<Handler>[0] extends object
    ? Taskwish.Action<
        Handler,
        Type extends string[] ? ["action", ...Type] : ["action", Type]
      >
    : Taskwish.NullaryAction<
        Handler,
        Type extends string[] ? ["action", ...Type] : ["action", Type]
      >;
}

export function Action<
  const Type extends string[] | string,
  Handler extends (...args: any) => any,
>(type: Type): ActionFactory<Type>;

export function Action(...args: any) {
  return {} as any;
}
