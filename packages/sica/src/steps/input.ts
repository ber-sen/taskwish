import { Sica } from "../types";

export const Input = <const Schema extends object>(
  schema: Sica.ValidateSchema<Schema>
): Sica.Flow<["input"], { input: Sica.InferInput<Schema> }> =>
  ({
    [Sica.Type]: ["input"],
    group: null,
  }) as never;
