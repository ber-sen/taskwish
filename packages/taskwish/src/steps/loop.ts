import { TaskWish } from "../types";

export const Loop = (
  ...params: Array<TaskWish.StepOption<any, "loop">>
): TaskWish.StepOption<"loop", null> => ({
  stepOptionType: "loop",
  group: null,
  params,
});

export const Range = (
  from: number,
  to: number
): TaskWish.StepOption<"range", "loop"> => ({
  stepOptionType: "range",
  group: "loop",
  params: {
    from,
    to,
  },
});
