import { PrettyScope } from "../helpers";
import { TW } from "../core";

export function Step<
  Ctx extends Record<any, any>,
  const Name extends "name" extends keyof Ctx["step"]
    ? Ctx["step"]["name"]
    : string,
  const Handler extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : (this: TW.Scope<PrettyScope<Ctx["scope"]>>) => any,
  const Params extends Name extends keyof Ctx["step"]["map"]
    ? Ctx["step"]["map"][Name]
    : never,
>(
  name: Name,
  handler: Name extends keyof Ctx["step"]["map"] ? Params : Handler,
): {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] &
      Record<
        Name,
        Name extends keyof Ctx["step"]["map"] ? string : ReturnType<Handler>
      >;
    [TW.Step]: Ctx["step"];
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
    : (this: TW.Scope<PrettyScope<Ctx["scope"]>>) => any,
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
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, A>;
    [TW.Step]: Ctx["step"];
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
    : (this: TW.Scope<PrettyScope<Ctx["scope"]>>) => any,
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
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"] & Record<Name, B>;
    [TW.Step]: Ctx["step"];
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
