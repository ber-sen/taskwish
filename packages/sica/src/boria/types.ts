import { UUIDv5String, UUIDv7String } from "../helpers";

export namespace Boria {
  export type ThreadId = UUIDv5String | UUIDv7String;

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
    user?: string;
    content: UserContent;
  };

  export type Assistant = {
    role: "assistant";
    content: AssistantContent;
  };

  export interface Message<
    Type extends (User | System | Assistant) & { meta?: any },
    Attributes = null,
  > {
    attr<
      Attr extends {
        redirectThreadId?: ThreadId;
        finalizeThread?: boolean;
      },
    >(
      attr: Attributes extends object ? "get" : Attr
    ): Attributes extends object ? Attributes : Message<Type, Attr>;
    role: Type["role"];
    content: Type["content"];
  }

  export interface Thread {
    id: ThreadId;
    actorId: UUIDv5String | UUIDv7String | string;
    state: "new" | "active" | "waiting" | "finalized" | "renewed";
    messages: Boria.AnyMessage[];
  }

  export type AnyMessage = Message<any, any>;
}
