import { Flow } from "../flow";
import { Sica } from "../types";

export const Input = <const Schema>(
  schema: Sica.ValidateSchema<Schema>
) => Flow("input").params({ input: schema as Sica.InferInput<Schema> });
