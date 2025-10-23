import { TaskWish } from "../types";

type OptionalBoolean<T> = {
  [K in keyof T]?: boolean;
};

export const Match = <const Input extends object>(
  input: Input,
  match: OptionalBoolean<Input>
): TaskWish.StepOption<"match", null> => ({
  stepOptionType: "match",
  group: null,
  params: {
    input,
    match
  },
});
