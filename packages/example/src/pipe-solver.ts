import { Int, Solve } from "@taskwish/smt";
import { Actor, Step } from "taskwish";

const { PipeSolver } = Actor("PipeSolver");

export const { solveAll } = PipeSolver()
  .on("Command", "solveAll")

  .run(
    Int("x"),

    Solve.all(
      "system",

      ({ x }) => x < 100000000,
      ({ x }) => x > 3,
    ),

    Step(["|>", "x"], async function* (source) {
      for await (const result of source) {
        yield `${result.model?.x}\n`;
      }
    }),
  );
