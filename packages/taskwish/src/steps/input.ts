import { TaskWish } from "../types";

export const Input = <const Schema extends object>(
  schema: TaskWish.ValidateSchema<Schema>
): TaskWish.StepOption<"input", null> => ({
  stepOptionType: "input",
  group: null,
  params: {},
});
