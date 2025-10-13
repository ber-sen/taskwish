import { TaskWish } from "../types";

export function Action<Name extends string, Params, Stream = never, Result = unknown, Ctx = unknown>(
  name: Name,
  execute: (
    params: Params
  ) =>
    | Result
    | AsyncGenerator<Stream, Result, Ctx>
    | Generator<Stream, Result, Ctx>
): Params extends object
  ? TaskWish.Action<Name, Params, Stream, Result, Ctx>
  : TaskWish.Runnable<Name, Stream, Result, Ctx>;

export function Action(execute: unknown) {
  return {
    run: execute,
    stream: execute,
  };
}
