import { Actor, Cond, Step, Steps, SubSteps, SubStepsResultKind } from "../../src";

const { actor } = Actor("Brancher");

const Branch: Steps<typeof SubSteps, SubStepsResultKind> = [] as never;

export const { solve } = actor()
  .on("Command", "solve")

  .input({ name: "string" }, "|", "void")

  .run(
    Branch(
      Cond("input", { name: "string" }),

      Step("smth", function () {
        return "Branched";
      }),
    ),

    Step("model", function () {
      return;
    }),
  );

export const { Brancher } = actor().service({ solve });
