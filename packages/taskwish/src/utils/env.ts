import { ArkErrors, type } from "arktype";
import { Exception } from "./exception";
import { Meta } from "./meta";
import { TaskWish } from "../types";

export function* Env<const def>(of: type.validate<def>): Generator<
  | TaskWish.Meta<{
      type: "requires";
      requires: "ctx";
      data: type.instantiate<def>["infer"];
    }>
  | TaskWish.Exception<{
      readonly status: 400;
      readonly errors: ArkErrors;
    }>,
  type.instantiate<def>["infer"] | undefined,
  Record<"env", type.instantiate<def>["infer"]>
> {
  const ctx = yield Meta({
    type: "requires",
    requires: "ctx",
    data: {} as type.instantiate<def>["infer"],
  });

  const env = type(of);

  const out = env(ctx.env);

  if (out instanceof type.errors) {
    yield Exception({ status: 400, errors: out });

    return undefined;
  }

  return out;
}