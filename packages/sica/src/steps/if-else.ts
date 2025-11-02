import { Sica } from "../types";

export const If = (condition: boolean): Sica.StepOption<"if", null> => ({
  stepOptionType: "if",
  group: null,
  params: { condition },
});

export const ElseIf = (condition: boolean): Sica.StepOption<"else-if", null> => ({
  stepOptionType: "else-if",
  group: null,
  params: { condition },
});

export const Else = (): Sica.StepOption<"else", null> => ({
  stepOptionType: "else",
  group: null,
});
