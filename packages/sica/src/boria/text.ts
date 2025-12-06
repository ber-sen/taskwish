import { Boria } from "./types";

export const Text = <const Content>(
  text: Content
): Boria.Part<{ type: "text"; text: Content }> => {
  return {} as never;
};

const a = Text("asdad");
