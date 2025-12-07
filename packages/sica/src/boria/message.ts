import { Boria } from "./types";

export function Message<const Content extends Array<Boria.MessagePart<any>>>(
  ...content: Content
): Boria.Message<Content> {
  return {} as never;
}
