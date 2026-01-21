import { Sica } from "../sica/src";

import { Boria } from "./types";

export function Message<const Content extends Array<Boria.MessagePart<any>>>(
  ...content: Content
): Boria.Message<Content> & {
  Event: Sica.EventKind<Boria.Message<Content, null>, ["event", "message"], null>;
} {
  return {} as never;
}
