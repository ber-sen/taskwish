import { TaskWish } from "./types";

export function Action<Params, Stream = never, Result = unknown, Ctx = unknown>(
  execute: (
    params: Params
  ) =>
    | Result
    | AsyncGenerator<Stream, Result, Ctx>
    | Generator<Stream, Result, Ctx>
): Params extends object
  ? TaskWish.Action<Params, Stream, Result, Ctx>
  : TaskWish.Runnable<Stream, Result, Ctx>;

export function Action(execute: unknown) {
  return {
    run: execute,
    stream: execute,
  };
}
