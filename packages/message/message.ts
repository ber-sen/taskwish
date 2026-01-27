import { Taskwish as Core } from "../core/src";

import { Taskwish } from "./types";

interface Message
  extends Core.EventKind<"Message", Array<Taskwish.MessagePart<any>>> {
  <const Content extends Array<Taskwish.MessagePart<any>>>(
    ...content: Content
  ): Taskwish.Message<Content>;
}

export const Message: Message = {} as never;
