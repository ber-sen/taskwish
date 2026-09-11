import { describe, expect, test } from "bun:test";

import { constraintToSmt } from "./expression";
import { buildSmtScript } from "./script";
import { valueToSmt } from "./symbols";

describe("Symbolic helpers", () => {
  test("valueToSmt converts scientific notation to exact rationals", () => {
    expect(valueToSmt(1e-9)).toBe("(/ 1 1000000000)");
    expect(valueToSmt(-1.25e-7)).toBe("(- (/ 125 1000000000))");
    expect(valueToSmt(2.5e21)).toBe("2500000000000000000000");
  });

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

    expect(
      constraintToSmt(
        ({ log, x }: { log: (value: number) => number; x: number }) =>
          log(x / 2) == 1,
      ),
    ).toBe("(= (log (/ x 2)) 1)");
  });

  test("buildSmtScript emits declarations, assertions, and model commands", () => {
    expect(
      buildSmtScript({
        declarations: [
          { name: "x", sort: "Int" },
          { name: "y", sort: "Int" },
          { name: "x", sort: "Int" },
          {
            kind: "function",
            name: "log",
            domain: ["Real"],
            range: "Real",
          },
        ],
        assertions: ["(> x 2)", "(= (+ x y) 5)"],
      }),
    ).toBe(
      [
        "(declare-const x Int)",
        "(declare-const y Int)",
        "(declare-fun log (Real) Real)",
        "(assert (> x 2))",
        "(assert (= (+ x y) 5))",
        "(check-sat)",
        "(get-model)",
        "",
      ].join("\n"),
    );
  });
});
