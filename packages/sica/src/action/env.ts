import { type } from "arktype";
import { Require } from "./require";

export function* Env<const def>(
  of: type.validate<def>
) {
  const ctx = yield* Require(["env"]).dep<type.instantiate<def>["infer"]>();

  return ctx;
}
