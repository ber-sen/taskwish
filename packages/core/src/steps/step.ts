import { PrettyScope } from "../helpers";
import { Taskwish } from "../core";

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: Taskwish.Scope<PrettyScope<Ctx["scope"]>>) => any,
  const Params extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : never,
>(
  name: Name,
  handler: Name extends keyof Ctx["step"]["map"] ? Params : Handler,
): {
  [Taskwish.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] &
      Record<
        Name,
        Name extends keyof Ctx["step"]["map"] ? string : ReturnType<Handler>
      >;
    [Taskwish.Step]: Ctx["step"];
    scope: Record<
      Name,
      Name extends keyof Ctx["step"]["map"] ? string : ReturnType<Handler>
    > &
      Ctx["scope"];
    last: ReturnType<Handler>;
  };
};

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: Taskwish.Scope<PrettyScope<Ctx["scope"]>>) => any,
  const Params extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : never,
  A,
>(
  name: Name,
  handler: [
    Name extends keyof Ctx["step"]["map"] ? Params : Handler,
    (
      res: Name extends keyof Ctx["step"]["map"] ? string : ReturnType<Handler>,
    ) => A,
  ],
): {
  [Taskwish.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, A>;
    [Taskwish.Step]: Ctx["step"];
    scope: Record<Name, A> & Ctx["scope"];
    last: ReturnType<Handler>;
  };
};

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: Taskwish.Scope<PrettyScope<Ctx["scope"]>>) => any,
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
      res: Name extends keyof Ctx["step"]["map"] ? string : ReturnType<Handler>,
    ) => A,
    (input: A) => B,
  ],
): {
  [Taskwish.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, B>;
    [Taskwish.Step]: Ctx["step"];
    scope: Record<Name, B> & Ctx["scope"];
    last: ReturnType<Handler>;
  };
};

export function Step() {
  return {} as never;
}

type ActionPaths<T, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? keyof T[K] extends never
      ? `${Prefix}${Extract<K, string>}`
      : ActionPaths<T[K], `${Prefix}${Extract<K, string>}.`>
    : never;
}[keyof T];
