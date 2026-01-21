import { Sica } from "../sica/src";

import { Boria } from "./types";

interface Message
  extends Sica.EventKind<Array<Boria.MessagePart<any>>, ["event", "message"]> {
  <const Content extends Array<Boria.MessagePart<any>>>(
    ...content: Content
  ): Boria.Message<Content>;
}

export const Message: Message = {} as never;
