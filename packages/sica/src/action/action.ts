import { Sica } from "../types";

export function Action<
  Name extends string,
  Handler extends (...args: any) => any,
>(
  name: Name,
  execute: Handler
): Parameters<Handler>[0] extends object
  ? Sica.Action<Name, Handler>
  : Sica.Runnable<Name, Handler>;



// export function Action<Name extends string>(
//   name: Name
// ): {
//   input<const Params, Stream = never>(
//     schema: Sica.ValidateSchema<Params>
//   ): {
//     handler: <Result = unknown, Ctx = unknown>(
//       execute: (
//         params: Sica.InferInput<Params>
//       ) =>
//         | Result
//         | AsyncGenerator<Stream, Result, Ctx>
//         | Generator<Stream, Result, Ctx>
//     ) => Sica.Action<Name, Sica.InferInput<Params>, Stream, Result, Ctx>;
//   };
// };

export function Action(...args: any) {
  return {} as any;
}
