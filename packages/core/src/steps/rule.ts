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

type RuleScope<Ctx extends Record<any, any>> = Pretty<
  InputFields<Ctx> & UserScope<Ctx>
>;

export function ruleDescription(name: string, fn: unknown): string {
  if (typeof fn !== "function") return `${name} = ${String(fn)}`;

  const source = fn.toString().trim();
  const arrowIndex = source.indexOf("=>");
  if (arrowIndex === -1) return `${name} = ${source}`;

  const body = source.slice(arrowIndex + 2).trim();
  const returnMatch = body.match(/^\{\s*return\s+([\s\S]*?);?\s*\}$/);
  const expression = returnMatch ? returnMatch[1].trim() : body;

  return `${name} = ${expression.replace(/;$/, "")}`;
}

export type RuleNode<
  Ctx extends Record<any, any> = any,
  Name extends string = string,
> = {
  [TW.Type]: "Rule";
  [TW.Step]: (ctx: Ctx) => Ctx;
  name: Name;
  description: string;
  fn: (...args: any[]) => unknown;
};

export function Rule<Ctx extends Record<any, any>, const Name extends string>(
  name: Name,
  fn: (scope: RuleScope<Ctx>) => unknown,
): RuleNode<Ctx, Name>;

export function Rule(name: string, fn: unknown): never {
  return {
    [TW.Type]: "Rule",
    name,
    description: ruleDescription(name, fn),
    fn,
  } as never;
}
