import { TW } from "../core";
import { Pretty, PrettyScope, ResolveScope } from "../helpers";

type UserScope<Ctx extends Record<any, any>> = TW.Scope<
  PrettyScope<ResolveScope<Ctx["scope"]>>
>;

type InputFields<Ctx extends Record<any, any>> = UserScope<Ctx> extends {
  input: infer Input;
}
  ? Input extends Record<string, unknown>
    ? Input
    : {}
  : {};

type TruthScope<Ctx extends Record<any, any>> = Pretty<
  InputFields<Ctx> & UserScope<Ctx>
>;

export class TruthAssertionError extends Error {
  readonly name = "TruthAssertionError";

  constructor(
    public readonly description: string,
    public readonly actual: unknown,
  ) {
    super(`Truth failed: ${description}`);
  }
}

export type TruthNode<Ctx extends Record<any, any> = any> = {
  [TW.Type]: "Truth";
  [TW.Step]: (ctx: Ctx) => Ctx;
  description: string;
  fn: (...args: any[]) => unknown;
};

export function Truth<Ctx extends Record<any, any>>(
  description: string,
  fn: (scope: TruthScope<Ctx>) => unknown,
): TruthNode<Ctx>;

export function Truth(description: string, fn: unknown): never {
  return { [TW.Type]: "Truth", description, fn } as never;
}
