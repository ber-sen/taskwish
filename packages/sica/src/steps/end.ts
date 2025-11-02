import { Sica } from "../types";

export const End = (
  params: (...params: any) => Sica.StepOption<any, null>
): Sica.StepOption<"end", null> => ({
  stepOptionType: "end",
  group: null,
  params,
});
