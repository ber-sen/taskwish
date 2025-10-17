import { TaskWish } from "../types";

export function Action<
  Type extends string,
  Params,
  Stream = never,
  Result = unknown,
  Ctx = unknown
>(
  type: Type,
  execute: (
    params: Params
  ) =>
    | Result
    | AsyncGenerator<Stream, Result, Ctx>
    | Generator<Stream, Result, Ctx>
): Params extends object
  ? TaskWish.Action<Type, Params, Stream, Result, Ctx>
  : TaskWish.Runnable<Type, Stream, Result, Ctx> {
  return {} as any;
}
