import { type TransferHandler } from "comlink";

export const asyncGeneratorTransferHandler: TransferHandler<Response, unknown> =
  {
    canHandle(obj: any): obj is Response {
      return obj instanceof Response;
    },
    serialize(obj) {
      return ["test", []];
    },
    deserialize(obj) {
      return new Response(obj as any);
    },
  };
