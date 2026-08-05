import { Trait } from "../../src";

export const Storage = Trait<{
  read: (input: string) => string;
  write: (input: { key: string; value: string }) => string;
}>();
