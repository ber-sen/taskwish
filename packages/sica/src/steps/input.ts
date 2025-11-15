import { Sica } from "../types";

export const Input = <const Schema extends object>(
  name: string,
  schema: Sica.ValidateSchema<Schema>
): Sica.StepOption<"input", null> => ({
  stepOptionType: "input",
  group: null,
  params: {},
});
