import { TaskWish } from "../types";

export function Action<
  Name extends string,
  Params,
  Stream = never,
  Result = unknown,
  Ctx = unknown,
>(
  name: Name,
  execute: (
    params: Params,
  ) =>
    | Result
    | AsyncGenerator<Stream, Result, Ctx>
    | Generator<Stream, Result, Ctx>,
): Params extends object
  ? TaskWish.Action<Name, Params, Stream, Result, Ctx>
  : TaskWish.Runnable<Name, Stream, Result, Ctx>;

export function Action<Name extends string>(
  name: Name,
): {
  input<const Params, Stream = never>(
    schema: TaskWish.ValidateSchema<Params>,
  ): {
    handler: <Result = unknown, Ctx = unknown>(
      execute: (
        params: TaskWish.InferInput<Params>,
      ) =>
        | Result
        | AsyncGenerator<Stream, Result, Ctx>
        | Generator<Stream, Result, Ctx>,
    ) => TaskWish.Action<
      Name,
      TaskWish.InferInput<Params>,
      Stream,
      Result,
      Ctx
    >;
  };
};

export function Action(...args: any) {
  return {} as any;
}
