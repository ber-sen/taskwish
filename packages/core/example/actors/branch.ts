import { Actor, Step } from "../../src";

const { actor } = Actor("Brancher");

export const { solve } = actor()
  .on("Command", "solve")

  .input({ name: "string" }, "|", "void")

  .run(
    Branch.onInput(
      { name: "string" },

      Step("smth", function () {
        return "Branched";
      }),
    ),

    Step("model", function () {
      return "Normal";
    }),
  );

export const { Brancher } = actor().service({ solve });
