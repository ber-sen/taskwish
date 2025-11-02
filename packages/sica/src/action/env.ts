import { ArkErrors, type } from "arktype";
import { Exception } from "./exception";
import { Meta } from "./meta";
import { Sica } from "../types";

export function* Env<const def>(of: type.validate<def>): Generator<
  | Sica.Meta<
      "requires",
      {
        requires: "ctx";
        data: type.instantiate<def>["infer"];
      }
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
  const ctx = yield Meta("requires", {
    requires: "ctx",
    data: {} as type.instantiate<def>["infer"],
  });

  const env = type(of);

  const out = env(ctx.env);

  if (out instanceof type.errors) {
    yield Exception(400, { errors: out });

    return undefined;
  }

  return out;
}
