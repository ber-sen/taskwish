import { Int, Solve } from "@taskwish/smt";
import { Actor, Step } from "taskwish";

const { PuzzleSolver } = Actor("PuzzleSolver");

export const { solvePuzzle } = PuzzleSolver()
  .on("Command", "solvePuzzle")

  .run(
    Int("square", "circle", "triangle"),

    Solve(
      "puzzle",

      ({ square, circle }) => square * square + circle == 16,
      ({ triangle }) => triangle * triangle * triangle == 27,
      ({ triangle, square }) => triangle * square == 6,
    ),

    Step("res", function () {
      if (!this.puzzle.model) {
        return;
      }

      return (
        this.puzzle.model.square *
        this.puzzle.model.circle *
        this.puzzle.model.triangle
      );
    }),
  );
