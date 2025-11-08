import { type } from "arktype";
import { Use } from "./use";
import { Sica } from "../types";

export function* Env<const def>(of: type.validate<def>) {
  const ctx = yield* Use<Sica.Struct<type.instantiate<def>["infer"], ["env"]>>(["env"]);

  return ctx;
}
