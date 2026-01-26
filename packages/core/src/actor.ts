import { Action } from "./action";
import { ToCapitalCase } from "./helpers";

export const Actor = <const Name extends string>(
  name: Name,
): {
  [key in ToCapitalCase<Name>]: typeof Action;
} => {
  return name as any;
};
