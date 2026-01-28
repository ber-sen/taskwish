import { Action } from "./action";
import { ToCapitalCase, ValidateSchema } from "./helpers";

export const Actor = <const Name extends string, const Config>(
  name: Name,
  config?: ValidateSchema<Config>
): {
  [key in ToCapitalCase<Name>]: typeof Action;
} => {
  return name as any;
};
