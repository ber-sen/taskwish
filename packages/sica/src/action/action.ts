import { Sica } from "../types";

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
  ? Sica.Action<Name, Params, Stream, Result, Ctx>
  : Sica.Runnable<Name, Stream, Result, Ctx>;

export function Action<Name extends string>(
  name: Name,
): {
  input<const Params, Stream = never>(
    schema: Sica.ValidateSchema<Params>,
  ): {
    handler: <Result = unknown, Ctx = unknown>(
      execute: (
        params: Sica.InferInput<Params>,
      ) =>
        | Result
        | AsyncGenerator<Stream, Result, Ctx>
        | Generator<Stream, Result, Ctx>,
    ) => Sica.Action<
      Name,
      Sica.InferInput<Params>,
      Stream,
      Result,
      Ctx
    >;
  };
};

export function Action(...args: any) {
  return {} as any;
}
