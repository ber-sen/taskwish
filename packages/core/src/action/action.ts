import { ToCamelCase, Apply } from "../helpers";
import { Taskwish } from "../types";

interface ActionFactory<
  Name extends string,
  Scope extends Record<any, any> = { model: "gpt" },
> {
  signature<
    const Signature extends ((...args: any) => Promise<any>) | Taskwish.Handler,
  >(): {
    handler<
      const Handler extends (
        this: Taskwish.Scope<Scope>,
        ...args: Signature extends (...args: any) => Promise<any>
          ? Parameters<Signature>
          : Signature extends Taskwish.Handler
            ? Parameters<Apply<Signature, Scope>>
            : never
      ) => Signature extends (...args: any) => Promise<any>
        ? ReturnType<Signature>
        : Signature extends Taskwish.Handler
          ? ReturnType<Apply<Signature, Scope>>
          : never,
    >(
      run: Handler,
    ): {
      [key in ToCamelCase<Name>]: Signature extends (
        ...args: any
      ) => Promise<any>
        ? Taskwish.Action<Name, Signature>
        : Signature extends Taskwish.Handler
          ? Taskwish.Action<Name, Apply<Signature, Scope>, Record<"handler", Signature>>
          : never;
    };
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
