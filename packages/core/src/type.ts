import { type } from "arktype";

export const Type = <const def>(
  t: type.validate<def>,
  description?: string,
): type.instantiate<def> =>
  description ? (type.raw(t).describe(description) as never) : (type.raw(t) as never);
