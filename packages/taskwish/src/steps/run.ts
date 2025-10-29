import { TaskWish } from "../types";

export const Run = (
  params: (...params: any) => TaskWish.StepOption<any, null>
): TaskWish.StepOption<"end", null> => ({
  stepOptionType: "end",
  group: null,
  params,
});
