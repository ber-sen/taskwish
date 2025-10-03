import { TaskWish } from "./types";

export function Action<Params, Stream, Result, Ctx>(
  execute: (
    params: [Params]
  ) => AsyncGenerator<Stream, Result, Ctx> | Generator<Stream, Result, Ctx>
): Params extends object
  ? TaskWish.Action<Params, Stream, Result, Ctx>
  : TaskWish.Runnable<Stream, Result, Ctx>;

export function Action<Params, Result>(
  execute: (params: [Params]) => Result
): Params extends object
  ? TaskWish.Action<never, Result, Result, unknown>
  : TaskWish.Runnable<never, Result, unknown>;

export function Action(execute: unknown) {
  return {
    run: execute,
    stream: execute
  }
}
