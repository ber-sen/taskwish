import { Sica } from "../types";

type OptionalBoolean<T> = {
  [K in keyof T]?: boolean;
};

export const Match = <const Input extends object>(
  input: Input,
  match: OptionalBoolean<Input>
): Sica.Flow<["match"], null> => ({
  [Sica.Type]: ["match"],
  group: null,
});
