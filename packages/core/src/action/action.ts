import { ToCamelCase } from "../helpers";
import { Steps } from "../steps";
import { Taskwish } from "../types";

interface ActionFactory<
  Name extends string,
  Scope extends Record<any, any> = { model: "gpt" },
> {
  signature<
    const Signature extends ((...args: any) => Promise<any>) | Steps<any>,
  >(): {
    handler<
      const Handler extends Signature extends Steps<any>
        ? (this: Taskwish.Scope<Scope>, steps: Array<any>) => Promise<any>
        : (this: Taskwish.Scope<Scope>, ...args: any) => Promise<any>,
    >(
      handler: Signature extends Steps<any>
        ? (this: Taskwish.Scope<Scope>, steps: Array<any>) => Promise<any>
        : Handler extends Signature
          ? Handler
          : never,
    ): {
      [key in ToCamelCase<Name>]: Taskwish.Action<Name, Signature>;
    };
  };
  handler<const Handler extends (...args: any) => Promise<any>>(
    handler: Handler | { withScope: (scope: Taskwish.Scope<Scope>) => Handler },
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
