import type { TransferHandler } from "./comlink";

export const asyncGeneratorTransferHandler: TransferHandler<
  Promise<Response>,
  unknown
> = {
  canHandle(obj: any): obj is Promise<Response> {
    return obj instanceof Response;
  },
  serialize(obj, options) {
    return [`localhost:3001/handler/${options?.path?.[0]}`, []];
  },
  deserialize(obj) {
    return fetch(obj as string);
  },
};

// export const asyncGeneratorTransferHandler: TransferHandler<unknown, unknown> =
// {
//   canHandle(obj: any): obj is Response {
//     return (
//       obj &&
//       typeof obj === "object" &&
//       typeof obj.next === "function" &&
//       (typeof obj[Symbol.iterator] === "function" ||
//         typeof obj[Symbol.asyncIterator] === "function")
//     );
//   },
//   serialize(obj, options) {
//     // const data = proxyTransferHandler.serialize(proxy(obj)) as any;

//     return [`localhost:3001/endpoint/${options?.path?.[0]}`, []];
//   },
//   deserialize(obj) {
//     return fetch(obj as string);
//     // const iterator = proxyTransferHandler.deserialize(
//     //   obj,
//     // ) as AsyncIterator<unknown>;

//     // while (true) {
//     //   const { value, done } = await iterator.next();

//     //   if (done) {
//     //     break;
//     //   }

//     //   yield value;
//     // }
//   },
// };
