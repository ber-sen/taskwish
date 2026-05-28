import { Trait } from "../../src";

const { Storage } = Trait("Storage");

export const { read, write } = Storage<{
  read: (input: string) => string;
  write: (input: { key: string; value: string }) => string;
}>();
