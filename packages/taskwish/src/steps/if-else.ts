import { TaskWish } from "../types";

export const If = (condition: boolean): TaskWish.StepOption<"if", null> => ({
  stepOptionType: "if",
  group: null,
  params: { condition },
});

export const ElseIf = (condition: boolean): TaskWish.StepOption<"else-if", null> => ({
  stepOptionType: "else-if",
  group: null,
  params: { condition },
});

export const Else = (): TaskWish.StepOption<"else", null> => ({
  stepOptionType: "else",
  group: null,
});
