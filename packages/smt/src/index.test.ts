import { describe, expect, test } from "bun:test";

import { Actor, Step, TW } from "@taskwish/core";

import { constraintToSmt } from "./expression";
import { buildSmtScript } from "./script";
import { Int, Real, Solve } from "./steps";

const eventData = (value: unknown) =>
  value instanceof TW.Trace || value instanceof TW.Signal ? value.data : value;

const eventDataList = (values: unknown[]) => values.map(eventData);

describe("SMT", () => {
  test("constraintToSmt converts JavaScript expressions to SMT-LIB", () => {
    expect(
      constraintToSmt(
        ({ x, y }: { x: number; y: number }) => x + 2 * y == 7,
      ),
    ).toBe("(= (+ x (* 2 y)) 7)");

    expect(
      constraintToSmt(
        ({ x, y }: { x: number; y: number }) => x > 1 && !(y == 0),
      ),
    ).toBe("(and (> x 1) (distinct y 0))");

    expect(
      constraintToSmt(({ x }: { x: number }) => x ** 2 == 9),
    ).toBe("(= (^ x 2) 9)");
  });

  test("buildSmtScript emits declarations, assertions, and model commands", () => {
    expect(
      buildSmtScript({
        declarations: [
          { name: "x", sort: "Int" },
          { name: "y", sort: "Int" },
          { name: "x", sort: "Int" },
        ],
        assertions: ["(> x 2)", "(= (+ x y) 5)"],
      }),
    ).toBe(
      [
        "(declare-const x Int)",
        "(declare-const y Int)",
        "(assert (> x 2))",
        "(assert (= (+ x y) 5))",
        "(check-sat)",
        "(get-model)",
        "",
      ].join("\n"),
    );
  });

  test("Solve runs as an actor step and returns a Z3 model", async () => {
    const { Solver } = Actor("Solver");

    const { solve } = Solver()
      .on("Command", "solve")

      .run(
        Int("x", "y"),

        Real("z"),

        Solve(
          "system",

          ({ x }) => x > 2,
          ({ y }) => y < 10,
          ({ x, y }) => x + 2 * y == 7,
          ({ x }) => x == 3,
          ({ y }) => y ** 2 == 4,
          ({ z }) => z == 1.5,
        ),

        Step("result", function () {
          return this.system;
        }),
      );

    type T = typeof solve;
    const actionName: T[typeof TW.Name] = "Solver::solve";
    expect(actionName).toBe("Solver::solve");

    const result = await solve();

    expect(result.status).toBe("sat");
    if (result.status !== "sat") throw new Error("Expected sat result");

    expect(result.model).toMatchObject({ x: 3, y: 2, z: 1.5 });
    expect("solutions" in result).toBe(false);
    expect("smtScript" in result).toBe(false);
    expect("output" in result).toBe(false);
  });

  test("Solve.orElseThrow returns the model directly", async () => {
    const { Solver } = Actor("Solver");

    const { solve } = Solver()
      .on("Command", "solve")

      .run(
        Int("x"),

        Solve.orElseThrow("system", ({ x }) => x == 4),

        Step("result", function () {
          return this.system;
        }),
      );

    await expect(solve()).resolves.toEqual({ x: 4 });
  });

  test("Solve.orElseThrow throws when the constraints are not sat", async () => {
    const { Solver } = Actor("Solver");

    const { solve } = Solver()
      .on("Command", "solve")

      .run(
        Int("x"),

        Solve.orElseThrow(
          "system",
          ({ x }) => x == 1,
          ({ x }) => x == 2,
        ),
      );

    await expect(solve()).rejects.toThrow("Expected sat, got unsat");
  });

  test("Solve.All yields each model as a pipeable async generator", async () => {
    const { Solver } = Actor("Solver");

    const { solve } = Solver()
      .on("Command", "solve")

      .run(
        Int("x"),

        Solve.All(
          "solutions",

          ({ x }) => x > 0,
          ({ x }) => x < 3,
        ),

        Step(["|>", "models"], async function* (source) {
          for await (const result of source) {
            if (result.status === "sat") yield result.model.x;
          }
        }),
      );

    const values: unknown[] = [];
    for await (const value of solve.stream()) values.push(value);

    const models = eventDataList(values).filter(
      (value): value is number => typeof value === "number",
    );
    expect(models.sort()).toEqual([1, 2]);
  });

  test("Solve emits step traces inside an actor stream", async () => {
    const { Solver } = Actor("Solver");

    const { solve } = Solver()
      .on("Command", "solve")

      .run(
        Int("x"),

        Solve("system", ({ x }) => x == 1),

        Step("model", function () {
          return this.system.model;
        }),
      );

    const yields: unknown[] = [];
    for await (const value of solve.stream()) yields.push(value);

    expect(eventDataList(yields)).toMatchObject([
      { ">>": "Solver::solve", input: undefined },
      { ">>": "Solver::solve.smt.Int.x" },
      { ">>": "Solver::solve.system" },
      { ">>": "Solver::solve.model", result: { x: 1 } },
      { ">>": "Solver::solve", result: { x: 1 } },
    ]);
  });
});
