import { Int, Model } from "@taskwish/symbolic";
import { Actor, Step } from "taskwish";

const { puzzleSolver } = Actor("PuzzleSolver");

export const { solvePuzzle } = puzzleSolver()
  .on("Command", "solvePuzzle")

  .run(
    Int("square", "circle", "triangle"),

    Model(
      "puzzle",

      ({ square, circle }) => square * square + circle == 16,
      ({ triangle }) => triangle * triangle * triangle == 27,
      ({ triangle, square }) => triangle * square == 6,
    ),

    Step("res", function () {
      return this.puzzle
        .solve()
        .then(({ square, circle, triangle }) => square * circle * triangle);
    }),
  );

export const { PuzzleSolver } = puzzleSolver().service({
  public: [solvePuzzle],
});
