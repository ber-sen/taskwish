import { Sica } from "../types";

export const Loop = (
  ...params: Array<Sica.StepOption<any, "loop">>
): Sica.StepOption<"loop", null> => ({
  stepOptionType: "loop",
  group: null,
  params,
});

export const Range = (
  from: number,
  to: number
): Sica.StepOption<"range", "loop"> => ({
  stepOptionType: "range",
  group: "loop",
  params: {
    from,
    to,
  },
});
