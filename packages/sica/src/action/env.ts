import { ArkErrors, type } from "arktype";
import { Exception } from "./exception";
import { Require } from "./require";
import { Sica } from "../types";

export function* Env<const def>(of: type.validate<def>): Generator<
  | Sica.Require<
      "ctx",
      type.instantiate<def>["infer"]
    >
  | Sica.Exception<
      400,
      {
        readonly errors: ArkErrors;
      }
    >,
  type.instantiate<def>["infer"] | undefined,
  Record<"env", type.instantiate<def>["infer"]>
> {
  const ctx = yield Require("ctx").type<type.instantiate<def>["infer"]>();
  
  const env = type(of);

  const out = env(ctx.env);

  if (out instanceof type.errors) {
    yield Exception(400, { errors: out });

    return undefined;
  }

  return out;
}
