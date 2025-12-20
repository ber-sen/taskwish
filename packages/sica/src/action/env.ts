import { type } from "arktype";
import { Use } from "./use";

export function* Env<const def>(of: type.validate<def>) {
  const ctx = yield* Use<type.instantiate<def>["infer"]>().as("env")

  return ctx;
}
