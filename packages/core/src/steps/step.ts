import { Append, FindInferTypeFilter, PrettyScope, RawEntry, ResolveScope } from "../helpers";
import { TW } from "../core";

/**
 * Resolve the "value" type of a step handler:
 * - async generator  → TReturn (the generator's return value, not the iterator)
 * - sync generator   → TReturn
 * - async function   → Awaited<ReturnType>
 * - sync function    → ReturnType
 */
type ResolveReturn<H extends (...args: any) => any> =
  Awaited<ReturnType<H>> extends AsyncGenerator<any, infer R, any>
    ? Awaited<R>
    : Awaited<ReturnType<H>> extends Generator<any, infer R, any>
      ? R
      : Awaited<ReturnType<H>>;

type UserScope<Ctx extends Record<any, any>> = PrettyScope<
  TW.Scope<ResolveScope<Ctx["scope"]>>
>;

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: UserScope<Ctx>) => any,
  const Params extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : never,
>(
  name: Name,
  handler: Name extends keyof Ctx["step"]["map"] ? Params : Handler,
): {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx extends { steps: infer L extends any[] }
      ? Name extends keyof Ctx["step"]["map"]
        ? L
        : [
            ...L,
            TW.Step<
              Name,
              FindInferTypeFilter<Ctx["plugins"]> extends infer Filter
                ? [Filter] extends [never]
                  ? () => ReturnType<Handler>
                  : Filter extends string
                    ? Filter extends Name
                      ? Handler
                      : () => ReturnType<Handler>
                    : Handler
                : () => ReturnType<Handler>
            >,
          ]
      : Name extends keyof Ctx["step"]["map"]
        ? []
        : [TW.Step<Name, () => ReturnType<Handler>>];
    [TW.Step]: Ctx["step"];
    scope: Record<
      Name,
      RawEntry<
        Name extends keyof Ctx["step"]["map"] ? string : ResolveReturn<Handler>,
        []
      >
    > &
      Ctx["scope"];
    last: RawEntry<ResolveReturn<Handler>, []>;
    plugins: Ctx["plugins"];
  };
};

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: UserScope<Ctx>) => any,
  const Params extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : never,
  A,
>(
  name: Name,
  handler: [
    Name extends keyof Ctx["step"]["map"] ? Params : Handler,
    (
      res: Name extends keyof Ctx["step"]["map"]
        ? string
        : ResolveReturn<Handler>,
    ) => A,
  ],
): {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx extends { steps: infer L extends any[] }
      ? [...L, TW.Step<Name, () => ReturnType<Handler>>]
      : [TW.Step<Name, () => ReturnType<Handler>>];
    [TW.Step]: Ctx["step"];
    scope: Record<Name, RawEntry<A, []>> & Ctx["scope"];
    last: RawEntry<ResolveReturn<Handler>, []>;
    plugins: Ctx["plugins"];
  };
};

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: UserScope<Ctx>) => any,
  const Params extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : never,
  A,
  B,
>(
  name: Name,
  handler: [
    Name extends keyof Ctx["step"]["map"] ? Params : Handler,
    (
      res: Name extends keyof Ctx["step"]["map"]
        ? string
        : ResolveReturn<Handler>,
    ) => A,
    (input: A) => B,
  ],
): {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx extends { steps: infer L extends any[] }
      ? [...L, TW.ScriptStep<Name, () => ReturnType<Handler>>]
      : [TW.ScriptStep<Name, () => ReturnType<Handler>>];
    [TW.Step]: Ctx["step"];
    scope: Record<Name, RawEntry<B, []>> & Ctx["scope"];
    last: RawEntry<ResolveReturn<Handler>, []>;
    plugins: Ctx["plugins"];
  };
};

export function Step(name?: unknown, handler?: unknown) {
  if (name === undefined || handler === undefined) return {} as never;
  const fn = Array.isArray(handler) ? handler[0] : handler;

  return Object.assign(handler as any, {
    [TW.Name]: name,
  }) as never;
}
