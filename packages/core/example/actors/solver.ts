import { Actor, TW } from "../../src";
import { PrettyScope, ResolveScope } from "../../src/helpers";

type UserScope<Ctx extends Record<any, any>> = PrettyScope<
  TW.Scope<ResolveScope<Ctx["scope"]>>
>;

export function Int<
  Ctx extends Record<string, any>,
  const V1 extends string,
  const V2 extends string,
>(
  v1: V1,
  v2: V2,
): {
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    [TW.Step]: Ctx["step"];
    scope: Record<V1, number> & Record<V2, number> & Ctx["scope"];
    last: number;
    plugins: Ctx["plugins"];
  };
} {
  return {} as never;
}

interface Solve {
  <Ctx extends Record<string, any>>(
    const1: (scope: UserScope<Ctx>) => number | boolean,
  ): {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"];
      [TW.Step]: Ctx["step"];
      scope: Ctx["scope"];
      last: null;
      plugins: Ctx["plugins"];
    };
  };
  <Ctx extends Record<string, any>>(
    const1: (scope: UserScope<Ctx>) => number | boolean,
    const2: (scope: UserScope<Ctx>) => number | boolean,
  ): {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"];
      [TW.Step]: Ctx["step"];
      scope: Ctx["scope"];
      last: null;
      plugins: Ctx["plugins"];
    };
  };
}

export const Solve: Solve = {} as never;

export const { Solver } = Actor("Solver");

export const { solve } = Solver()
  .on("Command", "solve")

  .input({ name: "string" })

  .run(
    Int("x", "y"),

    Solve(
      ({ x, y }) => x + y == 10,
      ({ x, y }) => x + 3 >= y - 4,
    ),
  );
