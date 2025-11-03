import { Sica } from "../types";

export function Action<
  Name extends string,
  Handler extends (...args: any) => any,
>(
  name: Name,
  execute: Handler
): Parameters<Handler>[0] extends object
  ? Sica.Action<Name, Handler>
  : Sica.Runnable<Name, Handler>;

export function Action<Name extends string>(
  name: Name
): {
  input<const Params>(schema: Sica.ValidateSchema<Params>): {
    handler: <Handler extends (params: Sica.InferInput<Params>) => any>(
      execute: Handler
    ) => Sica.Action<Name, Handler>;
  };
};

export function Action(...args: any) {
  return {} as any;
}
