import { Actor, Step, TW } from "../../src";
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

export function Real<
  Ctx extends Record<string, any>,
  const V1 extends string,
  const V2 extends string,
>(
  v1: V1,
  v2?: V2,
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

type SolveResult<T> =
  | {
      status: "sat";
      model: T;
      solutions: AsyncGenerator<SolveResult<T>, void, unknown>;
    }
  | { status: "unsat"; model: undefined; solutions: undefined }
  | {
      status: "unknown";
      model: undefined;
      reason: string;
      solutions: undefined;
    };

interface Solve {
  <const Name extends string, Ctx extends Record<string, any>>(name: Name): {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"];
      [TW.Step]: Ctx["step"];
      scope: Record<Name, SolveResult<UserScope<Ctx>>> & Ctx["scope"];
      last: Record<Name, SolveResult<UserScope<Ctx>>>;
      plugins: Ctx["plugins"];
    };
  };
  <const Name extends string, Ctx extends Record<string, any>>(
    name: Name,
    const1: (scope: UserScope<Ctx>) => number | boolean,
  ): {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"];
      [TW.Step]: Ctx["step"];
      scope: Record<Name, SolveResult<UserScope<Ctx>>> & Ctx["scope"];
      last: Record<Name, SolveResult<UserScope<Ctx>>>;
      plugins: Ctx["plugins"];
    };
  };
  <const Name extends string, Ctx extends Record<string, any>>(
    name: Name,
    const1: (scope: UserScope<Ctx>) => number | boolean,
    const2: (scope: UserScope<Ctx>) => number | boolean,
  ): {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"];
      [TW.Step]: Ctx["step"];
      scope: Record<Name, SolveResult<UserScope<Ctx>>> & Ctx["scope"];
      last: Record<Name, SolveResult<UserScope<Ctx>>>;
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

    Real("z"),

    Solve(
      "system",

      ({ x, y }) => x + y == 10,
      ({ x, y }) => x + 3 >= y - 4,
    ),

    Step("model", function () {
      return this.system.model;
    }),
  );
