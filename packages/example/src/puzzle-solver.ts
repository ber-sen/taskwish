import { Int, Solve } from "@taskwish/smt";
import { Actor, Step } from "taskwish";

const { PuzzleSolver } = Actor("PuzzleSolver");

export const { solvePuzzle } = PuzzleSolver()
  .on("Command", "solvePuzzle")

  .run(
    Int("square", "circle", "triangle"),

    Solve.orElseThrow(
      "puzzle",

      ({ square, circle }) => square * square + circle == 16,
      ({ triangle }) => triangle * triangle * triangle == 27,
      ({ triangle, square }) => triangle * square == 6,
    ),

    Step("res", function () {
      return this.puzzle.square * this.puzzle.circle * this.puzzle.triangle;
    }),
  );
