import { TW } from "../core";

type OptionalBoolean<T> = {
  [K in keyof T]?: boolean;
};

export const Match = <const Input extends object>(
  input: Input,
  match: OptionalBoolean<Input>
): TW.Flow<["match"]> => ({
  [TW.Name]: ["match"],
  group: null,
  params: {}
});
