import { Actor, Step } from "../../src";
import { Int, Model, Real } from "@taskwish/symbolic";

const { actor } = Actor("Solver");

export const { solve } = actor()
  .on("Command", "solve")

  .input({ name: "string" })

  .run(
    Int("x", "y"),

    Real("z"),

    Model(
      "linearEquation",

      ({ x, y }) => x + y == 10,
      ({ x, y }) => x + 3 >= y - 4
    ),

    Step("model", function () {
      return this.linearEquation.solve({ x: 2 });
    })
  );

export const { Solver } = actor().service({ solve });
