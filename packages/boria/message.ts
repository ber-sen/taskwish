import { Event } from "../sica/src/event";
import { Boria } from "./types";

export function Message<const Content extends Array<Boria.MessagePart<any>>>(
  ...content: Content
): Boria.Message<Content> {
  return {} as never;
}

Message.Event = Event<Boria.Message<any>, "message">();
