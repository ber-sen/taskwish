import { Action } from "./action";
import { ToCapitalCase, ValidateSchema } from "./helpers";

export const Actor = <const Name extends string, const Env>(
  name: Name,
  env?: ValidateSchema<Env>,
): {
  [key in ToCapitalCase<Name>]: () => { on: typeof Action };
} => {
  return name as any;
};
