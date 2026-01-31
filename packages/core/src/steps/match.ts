import { Taskwish } from "../types";

type OptionalBoolean<T> = {
  [K in keyof T]?: boolean;
};

export const Match = <const Input extends object>(
  input: Input,
  match: OptionalBoolean<Input>
): Taskwish.Flow<["match"]> => ({
  [Taskwish.Name]: ["match"],
  group: null,
  params: {}
});
