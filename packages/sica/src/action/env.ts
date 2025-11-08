import { type } from "arktype";
import { Use } from "./use";

export function* Env<const def>(of: type.validate<def>) {
  const ctx = yield* Use(["env"]).as<type.instantiate<def>["infer"]>()

  return ctx;
}
