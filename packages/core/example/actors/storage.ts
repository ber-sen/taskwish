import { Trait } from "../../src";

export const { read, write } = Trait<{
  read: (input: string) => string;
  write: (input: { key: string; value: string }) => string;
}>();
