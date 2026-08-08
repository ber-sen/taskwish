import { Int, Model } from "@taskwish/symbolic";
import { Actor, Step } from "taskwish";

const { pipeSolver } = Actor("PipeSolver");

export const { solveAll } = pipeSolver()
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

export const { PipeSolver } = pipeSolver().service({ solveAll });
