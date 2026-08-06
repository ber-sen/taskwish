import { Int, Model } from "@taskwish/symbolic";
import { Actor, Step } from "taskwish";

const { PipeSolver } = Actor("PipeSolver");

export const { solveAll } = PipeSolver()
  .on("Command", "solveAll")

  .run(
    Int("x"),

    Model(
      "integerRange",

      ({ x }) => x < 100000000,
      ({ x }) => x > 3,
    ),

    Step("solutions", function () {
      return this.integerRange.solveAll();
    }),

    Step(["|>", "x"], async function* (source) {
      for await (const model of source) {
        yield `${model.x}\n`;
      }
    }),
  );
