import { Int, Model } from "@taskwish/symbolic";
import { Actor, Step } from "taskwish";

const { Solver } = Actor("Solver");

export const { solve } = Solver()
  .on("Command", "solve")

  .run(
    Int("x"),

    Model(
      "quadraticEquation",

      ({ x }) => x ** 2 + 2 * x == 0,
      ({ x }) => x != 0,
    ),

    Step("result", function () {
      return this.quadraticEquation.solve();
    }),
  );
