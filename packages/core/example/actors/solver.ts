import { Actor, TW } from "../../src";

interface Solve {
  <Ctx extends Record<string, any>>(name: string): {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"];
      [TW.Step]: Ctx["step"];
      scope: Ctx["scope"];
      last: null;
      plugins: Ctx["plugins"];
    };
  };
  <Ctx extends Record<string, any>, A>(
    name: string,
    step1: { [TW.Step]: (input: Ctx) => A },
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
  <Ctx extends Record<string, any>, A, B>(
    name: string,
    step1: { [TW.Step]: (input: Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
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
  <Ctx extends Record<string, any>, A, B, C>(
    name: string,
    step1: { [TW.Step]: (input: Ctx) => A },
    step2: { [TW.Step]: (input: A) => B },
    step3: { [TW.Step]: (input: B) => C },
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
    Solve(
      "equation",

      Int("x", "y"),

      ({ x, y }) => x + y == 10,
      ({ x, y }) => x + 3 >= y - 4,
    ),
  );
