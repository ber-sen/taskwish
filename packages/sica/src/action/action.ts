import { Sica } from "../types";

interface ActionFactory<Type extends string[] | string> {
  handler<const Handler extends (...args: any) => any>(
    handler: Handler,
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
}

export function Action<
  const Type extends string[] | string,
  Handler extends (...args: any) => any,
>(type: Type): ActionFactory<Type>;

export function Action(...args: any) {
  return {} as any;
}

Action.Interface = <const S, const R = null>(
  input: Sica.ValidateSchema<S>,
  output?: Sica.ValidateSchema<R>
): Sica.InferSchema<S> => {
  return {} as any;
};
