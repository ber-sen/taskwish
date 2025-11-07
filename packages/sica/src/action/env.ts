import { type } from "arktype";
import { Require } from "./require";

export function* Env<const def>(
  of: type.validate<def>
) {
  const ctx = yield* Require<type.instantiate<def>["infer"]>().type(["env"]);

  return ctx;
}
