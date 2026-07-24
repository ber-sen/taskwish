import { Actor, Step } from "../../src";
import { Int, Real, Solve } from "@taskwish/smt";

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
