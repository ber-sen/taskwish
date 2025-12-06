import { Boria } from "./types";

export function Text<const Content>(
  text: Content
): Boria.Part<{ type: "text"; text: Content }>;

export function Text<const Class extends string[], const Content>(
  cls: Class,
  text: Content
): Boria.Part<{ type: "text"; cls: Class; text: Content }>;

export function Text(...args) {
  return {} as never;
}
