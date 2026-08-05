import { describe, expect, test } from "bun:test";

import { constraintToSmt } from "./expression";
import { buildSmtScript } from "./script";

describe("Symbolic helpers", () => {
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
});
