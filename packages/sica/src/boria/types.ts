import { UUIDv5String, UUIDv7String } from "../helpers";

interface Json {
  [x: string]: string | number | boolean | Date | Json | JsonArray;
}
interface JsonArray
  extends Array<string | number | boolean | Date | Json | JsonArray> {}

export namespace Boria {
  export type UserThreadId = UUIDv5String | UUIDv7String;

  export type DataContent = string | Uint8Array | ArrayBuffer | Buffer;

  export interface TextPart {
    type: "text";
    text: string;
  }

  export interface ImagePart {
    type: "image";
    image: DataContent | URL;
    mediaType?: string;
  }

  export interface FilePart {
    type: "file";
    data: DataContent | URL;
    filename?: string;
    mediaType: string;
  }

  export type UserContent = string | Array<TextPart | ImagePart | FilePart>;

  export interface ReasoningPart {
    type: "reasoning";
    text: string;
  }

  export type AssistantContent =
    | string
    | Array<TextPart | FilePart | ReasoningPart>;

  export type System = {
    role: "system";
    content: string;
  };

  export type User = {
    role: "user";
    content: UserContent;
  };

  export type Icoming = {
    role: "incoming";
    contact?: Json;
    content: UserContent;
  };

  export type Assistant = {
    role: "assistant";
    content: AssistantContent;
  };

  export interface Message<
    Type extends (User | System | Assistant | Icoming) & { meta?: any },
    Meta = null,
  > {
    meta<
      Tags extends {
        redirectThreadId?: UserThreadId;
        finalizeThread?: boolean;
      },
    >(
      meta: Meta extends object ? "get" : Tags
    ): Meta extends object ? Meta : Message<Type, Tags>;
    role: Type["role"];
    content: Type["content"];
  }

  export interface UserThreadMessage<
    Type extends (User | System | Assistant | Icoming) & { meta?: any },
    Meta = null,
  > {
    meta: Meta;
    role: Type["role"];
    content: Type["content"];
    userThreadId: UserThreadId;
  }

  export interface UserThread {
    id: UserThreadId;
    userId: UUIDv7String;
    state: "new" | "active" | "waiting" | "finalized" | "renewed";
    messages: UserThreadMessage<any, any>[];
    workflowId?: UUIDv5String;
    reply: (params: any) => any;
  }
}
