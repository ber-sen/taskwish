import { Sica } from "../types";

export function Action<
  const Type extends string[] | string,
  Handler extends (...args: any) => any,
>(
  type: Type,
  execute: Handler,
  composer?: (fn: Handler) => any
): Parameters<Handler>[0] extends object
  ? Sica.Action<
      Handler,
      Type extends string[] ? ["action", ...Type] : ["action", Type]
    >
  : Sica.NullaryAction<
      Handler,
      Type extends string[] ? ["action", ...Type] : ["action", Type]
    >;

export function Action(...args: any) {
  return {} as any;
}
