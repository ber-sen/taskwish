import { UUIDv5String, UUIDv7String } from "../helpers";
import { Sica } from "../types";

interface Json {
  [x: string]: string | number | boolean | Date | Json | JsonArray;
}
interface JsonArray
  extends Array<string | number | boolean | Date | Json | JsonArray> {}

export namespace Boria {
  export type ThreadId = UUIDv7String;

  export type IdentityId = `${string}:${string}`;

  export type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

  export type MessagePart<Schema extends { type: any } & Record<any, any>> = {
    [K in keyof Schema]: Schema[K];
  };

  export interface Message<
    Content extends Array<MessagePart<any>> | string,
    Meta = null,
  > {
    threadId: Sica.Inject<ThreadId>;
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
