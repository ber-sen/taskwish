import { UUIDv5String, UUIDv7String } from "../helpers";
import { Sica } from "../types";

interface Json {
  [x: string]: string | number | boolean | Date | Json | JsonArray;
}
interface JsonArray
  extends Array<string | number | boolean | Date | Json | JsonArray> {}

export namespace Boria {
  export type ThreadId = UUIDv7String;
  
  export type IdentityId = UUIDv5String;

  export type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

  export type Part<Schema extends { type: string }> = Schema;

  export interface Message<
    Content extends Array<Part<any>> | string,
    Meta = null,
  > {
    meta<
      Tags extends {
        redirectThreadId?: ThreadId;
        finalizeThread?: boolean;
      },
    >(
      meta: Meta extends object ? "get" : Tags
    ): Meta extends object ? Meta : Message<Content, Tags>;
    identityId: Sica.Inject<IdentityId>;
    content: Content;
  }

  export interface Thread {
    id: ThreadId;
    state: "new" | "active" | "waiting" | "finalized" | "renewed";
    messages: Message<any, any>[];
    workflowId?: UUIDv5String;
    reply: (params: any) => any;
  }
}
