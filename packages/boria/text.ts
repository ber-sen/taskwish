import { Boria } from "./types";

export function Text<const Content extends string>(
  text: Content
): Boria.MessagePart<{ type: "text"; text: Content }>;

export function Text<const Class extends string[], const Content  extends string>(
  cls: Class,
  text: Content
): Boria.MessagePart<{ type: "text"; cls: Class; text: Content }>;

export function Text(...args: any) {
  return {} as never;
}
