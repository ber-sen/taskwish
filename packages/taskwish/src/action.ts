import { Runnable } from "./runnable";

export interface Action<Params extends Array<any>, Stream, Result, Ctx> {
  run(...params: Params): Promise<Result>;
  stream(...params: Params): AsyncGenerator<Stream, Result, undefined>;
}

export function Action<Params extends Array<any>, Stream, Result, Ctx>(
  execute: (
    ...params: Params
  ) => AsyncGenerator<Stream, Result, Ctx> | Generator<Stream, Result, Ctx>
): Params extends object
  ? Action<Params, Stream, Result, Ctx>
  : Runnable<Stream, Result, Ctx> {
  return execute as any;
}
